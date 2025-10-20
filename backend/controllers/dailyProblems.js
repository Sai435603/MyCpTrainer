import fetch from "node-fetch";
import User from "../models/User.js";
import Problem from "../models/Problem.js";

function isSameDayInIST(d1, d2) {
  const opts = { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" };
  const s1 = new Intl.DateTimeFormat("en-GB", opts).format(d1);
  const s2 = new Intl.DateTimeFormat("en-GB", opts).format(d2);
  return s1 === s2;
}

async function queryProblems({ tags, ratingMin, ratingMax, solvedPairs, limit = 10 }) {
  const filter = {};

  if (Array.isArray(tags) && tags.length > 0) filter.tags = { $in: tags };

  if (typeof ratingMin === "number" || typeof ratingMax === "number") {
    filter.rating = {};
    if (typeof ratingMin === "number") filter.rating.$gte = ratingMin;
    if (typeof ratingMax === "number") filter.rating.$lte = ratingMax;
  }

  if (Array.isArray(solvedPairs) && solvedPairs.length > 0) {
    filter.$nor = solvedPairs.map(p => ({ contestId: p.contestId, index: p.index }));
  }

  const docs = await Problem.find(filter).sort({ rating: 1, contestId: -1, index: 1 }).limit(limit * 3).lean();

  return docs.map(d => ({
    contestId: d.contestId,
    index: d.index,
    name: d.name,
    rating: d.rating ?? null,
    tags: d.tags ?? [],
    problemId: `${d.contestId}-${d.index}`,
  }));
}

export default async function dailyProblems(req, res) {
  try {
    const handle = req.params?.user;
    if (!handle) return res.status(400).json({ error: "Missing handle" });

    const user = await User.findOne({ handle }).lean();
    if (!user) return res.status(404).json({ error: `User not found: ${handle}` });

    const userRating = typeof user.rating === "number" ? user.rating : 800;

    if (user.dailyProblems?.generatedAt && isSameDayInIST(new Date(user.dailyProblems.generatedAt), new Date())) {
      return res.json({
        handle,
        rating: userRating,
        problems: user.dailyProblems.items,
        dailyProblems: user.dailyProblems,
        meta: { cached: true, message: "Returning same-day cached dailyProblems" },
      });
    }

    const CF_COUNT = 1000;
    const cfUrl = `https://codeforces.com/api/user.status?handle=${encodeURIComponent(handle)}&from=1&count=${CF_COUNT}`;
    const cfResp = await fetch(cfUrl);
    if (!cfResp.ok) {
      const text = await cfResp.text().catch(() => "Could not read response body");
      return res.status(502).json({ error: "Failed to fetch Codeforces submissions", details: text });
    }

    const cfJson = await cfResp.json();
    if (cfJson.status !== "OK" || !Array.isArray(cfJson.result)) {
      return res.status(502).json({ error: "Unexpected Codeforces API response", raw: cfJson });
    }

    const problemMap = new Map();
    for (const s of cfJson.result) {
      const p = s.problem;
      if (!p || p.contestId == null || !p.index) continue;
      const key = `${p.contestId}-${p.index}`;
      let entry = problemMap.get(key);
      if (!entry) {
        entry = {
          contestId: p.contestId,
          index: p.index,
          name: p.name,
          rating: p.rating ?? null,
          tags: Array.isArray(p.tags) ? p.tags.slice() : [],
          attempts: 0,
          solved: false,
        };
        problemMap.set(key, entry);
      }
      entry.attempts += 1;
      if (s.verdict === "OK") entry.solved = true;
    }

    const solvedSet = new Set();
    const tagAttempts = {};
    const tagSolved = {};
    for (const [, e] of problemMap.entries()) {
      if (e.solved) solvedSet.add(`${e.contestId}-${e.index}`);
      for (const tag of e.tags ?? []) {
        tagAttempts[tag] = (tagAttempts[tag] || 0) + e.attempts;
        tagSolved[tag] = (tagSolved[tag] || 0) + (e.solved ? 1 : 0);
      }
    }

    const MIN_ATTEMPTS = 3;
    const tagStats = Object.keys(tagAttempts)
      .map(tag => ({
        tag,
        attempts: tagAttempts[tag],
        solved: tagSolved[tag] || 0,
        successRate: tagAttempts[tag] > 0 ? (tagSolved[tag] || 0) / tagAttempts[tag] : 0,
      }))
      .sort((a, b) => a.successRate - b.successRate || b.attempts - a.attempts);

    let weakTags = tagStats.filter(t => t.attempts >= MIN_ATTEMPTS).slice(0, 5).map(t => t.tag);
    if (weakTags.length < 3) weakTags = tagStats.slice(0, 5).map(t => t.tag);

    const solvedPairs = Array.from(solvedSet).map(key => {
      const [contestIdStr, index] = key.split("-");
      return { contestId: Number(contestIdStr), index };
    });

    const RATING_FLOOR = 800;
    const RATING_CEIL = 3500;
    const easyRange = { min: Math.max(RATING_FLOOR, userRating - 200), max: Math.max(RATING_FLOOR, userRating - 100) };
    const mediumRange = { min: Math.max(RATING_FLOOR, userRating -100), max: Math.min(RATING_CEIL, userRating) };
    const hardRange = { min: Math.min(RATING_CEIL, userRating + 200), max: Math.min(RATING_CEIL, userRating + 500) };

    const TOTAL_WANTED = 10;
    const desired = { easy: 3, medium: 4, hard: 3 };
    const collected = [];
    const visited = new Set();

    async function pushCandidates(params) {
      const candidates = await queryProblems(params);
      for (const p of candidates) {
        if (!p?.problemId || visited.has(p.problemId)) continue;
        visited.add(p.problemId);
        collected.push(p);
      }
    }

    await pushCandidates({ tags: weakTags, ratingMin: easyRange.min, ratingMax: easyRange.max, solvedPairs, limit: desired.easy });
    if (collected.length < TOTAL_WANTED) await pushCandidates({ tags: weakTags, ratingMin: mediumRange.min, ratingMax: mediumRange.max, solvedPairs, limit: desired.medium });
    if (collected.length < TOTAL_WANTED) await pushCandidates({ tags: weakTags, ratingMin: hardRange.min, ratingMax: hardRange.max, solvedPairs, limit: desired.hard });

    if (collected.length < TOTAL_WANTED) {
      const remaining = TOTAL_WANTED - collected.length;
      await pushCandidates({ tags: weakTags, ratingMin: Math.max(RATING_FLOOR, userRating - 300), ratingMax: Math.min(RATING_CEIL, userRating + 300), solvedPairs, limit: remaining });
    }

    if (collected.length < TOTAL_WANTED) {
      const remaining = TOTAL_WANTED - collected.length;
      const fallbackFilter = { rating: { $gte: RATING_FLOOR, $lte: RATING_CEIL } };
      if (solvedPairs.length > 0) fallbackFilter.$nor = solvedPairs;
      const docs = await Problem.find(fallbackFilter).sort({ contestId: -1 }).limit(remaining).lean();
      for (const d of docs) {
        const pid = `${d.contestId}-${d.index}`;
        if (visited.has(pid)) continue;
        visited.add(pid);
        collected.push({ ...d, problemId: pid });
      }
    }

    const finalProblems = collected
      .slice(0, TOTAL_WANTED)
      .map(p => ({ problemId: p.problemId, contestId: p.contestId, index: p.index, name: p.name, rating: p.rating ?? null, tags: p.tags ?? [] }))
      .sort((a, b) => (a.rating ?? Infinity) - (b.rating ?? Infinity));

    const generatedAt = new Date();
    await User.updateOne({ handle }, { $set: { "dailyProblems.items": finalProblems, "dailyProblems.generatedAt": generatedAt } });

    res.json({
      handle,
      rating: userRating,
      weakTags,
      problems: finalProblems,
      dailyProblems: { items: finalProblems, generatedAt },
      meta: { cached: false, submissionsConsidered: cfJson.result.length, uniqueProblemsSeen: problemMap.size },
    });
  } catch (err) {
    console.error("dailyProblems error:", err);
    res.status(500).json({ error: "Internal server error", details: err?.message ?? String(err) });
  }
}
