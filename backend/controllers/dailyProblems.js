import fetch from "node-fetch";
import User from "../models/User.js";
import Problem from "../models/Problem.js";
import LeetcodeProblem from "../models/LeetcodeProblem.js";
import { cacheGet, cacheSet } from "../utils/redis.js";

function isSameDayInIST(d1, d2) {
  const opts = { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" };
  const s1 = new Intl.DateTimeFormat("en-GB", opts).format(d1);
  const s2 = new Intl.DateTimeFormat("en-GB", opts).format(d2);
  return s1 === s2;
}

// CF tag → LC topic tag mapping for cross-platform suggestions
const CF_TO_LC_TAGS = {
  "dp": "dynamic-programming",
  "greedy": "greedy",
  "graphs": "graph",
  "trees": "tree",
  "binary search": "binary-search",
  "math": "math",
  "strings": "string",
  "data structures": "hash-table",
  "sortings": "sorting",
  "dfs and similar": "depth-first-search",
  "bfs": "breadth-first-search",
  "two pointers": "two-pointers",
  "brute force": "brute-force",
  "number theory": "number-theory",
  "combinatorics": "combinatorics",
  "geometry": "geometry",
  "implementation": "simulation",
  "constructive algorithms": "constructive",
  "bit manipulation": "bit-manipulation",
  "divide and conquer": "divide-and-conquer",
};

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
    source: "codeforces",
  }));
}

function getDifficultyLabel(rating) {
  if (rating <= 1000) return "Warm-up";
  if (rating <= 1300) return "Easy";
  if (rating <= 1600) return "Medium";
  if (rating <= 2000) return "Hard";
  if (rating <= 2400) return "Expert";
  return "Legendary";
}

function getLcDifficultyForRating(rating) {
  if (rating < 1400) return "Easy";
  if (rating < 1900) return "Medium";
  return "Hard";
}

async function queryLeetcodeProblems({ lcTags, difficulty, limit = 3 }) {
  const filter = { paidOnly: false, difficulty };
  if (Array.isArray(lcTags) && lcTags.length > 0) {
    filter.topicTags = { $in: lcTags };
  }

  const total = await LeetcodeProblem.countDocuments(filter);
  if (total === 0) return [];

  // Random sampling for variety
  const skip = Math.max(0, Math.floor(Math.random() * (total - limit)));
  const docs = await LeetcodeProblem.find(filter).skip(skip).limit(limit).lean();

  return docs.map(d => ({
    problemId: `lc-${d.frontendId}`,
    name: d.title,
    rating: null,
    difficulty: d.difficulty,
    tags: d.topicTags ?? [],
    source: "leetcode",
    titleSlug: d.titleSlug,
    frontendId: d.frontendId,
  }));
}

export default async function dailyProblems(req, res) {
  try {
    const handle = req.params?.user;
    if (!handle) return res.status(400).json({ error: "Missing handle" });

    const user = await User.findOne({ handle }).lean();
    if (!user) return res.status(404).json({ error: `User not found: ${handle}` });

    const userRating = typeof user.rating === "number" ? user.rating : 800;

    // Return cached daily problems if same day
    if (user.dailyProblems?.generatedAt && isSameDayInIST(new Date(user.dailyProblems.generatedAt), new Date())) {
      return res.json({
        handle,
        rating: userRating,
        problems: user.dailyProblems.items,
        dailyProblems: user.dailyProblems,
        meta: { cached: true, message: "Returning same-day cached dailyProblems" },
      });
    }

    // Try Redis cache for CF submissions
    const cacheKey = `cf_submissions:${handle}`;
    let cfResult = await cacheGet(cacheKey);

    if (!cfResult) {
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
      cfResult = cfJson.result;
      // Cache for 10 minutes
      await cacheSet(cacheKey, cfResult, 600);
    }

    // Analyze submissions
    const problemMap = new Map();
    for (const s of cfResult) {
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

    // 5-tier difficulty bucketing
    const RATING_FLOOR = 800;
    const RATING_CEIL = 3500;
    const tiers = {
      warmup:  { min: Math.max(RATING_FLOOR, userRating - 300), max: Math.max(RATING_FLOOR, userRating - 200), count: 1 },
      easy:    { min: Math.max(RATING_FLOOR, userRating - 200), max: Math.max(RATING_FLOOR, userRating - 100), count: 2 },
      medium:  { min: Math.max(RATING_FLOOR, userRating - 100), max: Math.min(RATING_CEIL, userRating + 100),  count: 2 },
      hard:    { min: Math.min(RATING_CEIL, userRating + 100),   max: Math.min(RATING_CEIL, userRating + 300),  count: 1 },
      stretch: { min: Math.min(RATING_CEIL, userRating + 300),   max: Math.min(RATING_CEIL, userRating + 600),  count: 1 },
    };

    const CF_TOTAL = 7; // 7 CF + 3 LC = 10 total
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

    // Fetch from each tier
    for (const [, tier] of Object.entries(tiers)) {
      if (collected.length >= CF_TOTAL) break;
      await pushCandidates({
        tags: weakTags,
        ratingMin: tier.min,
        ratingMax: tier.max,
        solvedPairs,
        limit: tier.count,
      });
    }

    // Fill remaining CF slots
    if (collected.length < CF_TOTAL) {
      const remaining = CF_TOTAL - collected.length;
      await pushCandidates({
        tags: weakTags,
        ratingMin: Math.max(RATING_FLOOR, userRating - 300),
        ratingMax: Math.min(RATING_CEIL, userRating + 300),
        solvedPairs,
        limit: remaining,
      });
    }

    // Absolute fallback for CF
    if (collected.length < CF_TOTAL) {
      const remaining = CF_TOTAL - collected.length;
      const fallbackFilter = { rating: { $gte: RATING_FLOOR, $lte: RATING_CEIL } };
      if (solvedPairs.length > 0) fallbackFilter.$nor = solvedPairs.slice(0, 500);
      const docs = await Problem.find(fallbackFilter).sort({ contestId: -1 }).limit(remaining).lean();
      for (const d of docs) {
        const pid = `${d.contestId}-${d.index}`;
        if (visited.has(pid)) continue;
        visited.add(pid);
        collected.push({ ...d, problemId: pid, source: "codeforces" });
      }
    }

    // === LeetCode Problems (3 problems) ===
    const lcWeakTags = weakTags
      .map(t => CF_TO_LC_TAGS[t.toLowerCase()])
      .filter(Boolean);

    const lcDifficulty = getLcDifficultyForRating(userRating);
    const lcDifficulties = lcDifficulty === "Easy"
      ? ["Easy", "Easy", "Medium"]
      : lcDifficulty === "Medium"
      ? ["Easy", "Medium", "Hard"]
      : ["Medium", "Hard", "Hard"];

    for (const diff of lcDifficulties) {
      if (collected.length >= 10) break;
      const lcProblems = await queryLeetcodeProblems({
        lcTags: lcWeakTags.length > 0 ? lcWeakTags : undefined,
        difficulty: diff,
        limit: 1,
      });
      for (const p of lcProblems) {
        if (!visited.has(p.problemId)) {
          visited.add(p.problemId);
          collected.push(p);
        }
      }
    }

    // Ensure tag diversity (at least 3 different tags if possible)
    const tagCoverage = new Set();
    for (const p of collected) {
      for (const t of p.tags || []) tagCoverage.add(t);
    }

    const finalProblems = collected
      .slice(0, 10)
      .map(p => ({
        problemId: p.problemId,
        contestId: p.contestId ?? null,
        index: p.index ?? null,
        name: p.name,
        rating: p.rating ?? null,
        difficulty: p.difficulty || (p.rating ? getDifficultyLabel(p.rating) : null),
        tags: p.tags ?? [],
        source: p.source || "codeforces",
        titleSlug: p.titleSlug ?? null,
        frontendId: p.frontendId ?? null,
      }))
      .sort((a, b) => {
        // CF problems first, then LC; within each group sort by difficulty
        if (a.source !== b.source) return a.source === "codeforces" ? -1 : 1;
        return (a.rating ?? Infinity) - (b.rating ?? Infinity);
      });

    const generatedAt = new Date();
    await User.updateOne({ handle }, { $set: { "dailyProblems.items": finalProblems, "dailyProblems.generatedAt": generatedAt } });

    res.json({
      handle,
      rating: userRating,
      weakTags,
      problems: finalProblems,
      dailyProblems: { items: finalProblems, generatedAt },
      meta: {
        cached: false,
        submissionsConsidered: cfResult.length,
        uniqueProblemsSeen: problemMap.size,
        cfProblems: finalProblems.filter(p => p.source === "codeforces").length,
        lcProblems: finalProblems.filter(p => p.source === "leetcode").length,
        tagCoverage: tagCoverage.size,
      },
    });
  } catch (err) {
    console.error("dailyProblems error:", err);
    res.status(500).json({ error: "Internal server error", details: err?.message ?? String(err) });
  }
}
