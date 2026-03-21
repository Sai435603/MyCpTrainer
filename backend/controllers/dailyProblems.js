import fetch from "node-fetch";
import User from "../models/User.js";
import Problem from "../models/Problem.js";
import LeetcodeProblem from "../models/LeetcodeProblem.js";
import { cacheGet, cacheSet } from "../utils/redis.js";

function isSameDayInIST(d1, d2) {
  const opts = { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" };
  return new Intl.DateTimeFormat("en-GB", opts).format(d1) === new Intl.DateTimeFormat("en-GB", opts).format(d2);
}

// CF tag → LC topic mapping
const CF_TO_LC_TAGS = {
  dp: "dynamic-programming", greedy: "greedy", graphs: "graph", trees: "tree",
  "binary search": "binary-search", math: "math", strings: "string",
  "data structures": "hash-table", sortings: "sorting", "dfs and similar": "depth-first-search",
  bfs: "breadth-first-search", "two pointers": "two-pointers", "brute force": "brute-force",
  "number theory": "number-theory", combinatorics: "combinatorics", geometry: "geometry",
  implementation: "simulation", "constructive algorithms": "constructive",
  "bit manipulation": "bit-manipulation", "divide and conquer": "divide-and-conquer",
};

function getDifficultyLabel(rating) {
  if (rating <= 1000) return "Warm-up";
  if (rating <= 1300) return "Easy";
  if (rating <= 1600) return "Medium";
  if (rating <= 2000) return "Hard";
  if (rating <= 2400) return "Expert";
  return "Legendary";
}

// ─── CF Problem Query ───
async function queryCFProblems({ tags, ratingMin, ratingMax, solvedPairs, excludeIds, limit = 10 }) {
  const filter = {};
  if (tags?.length) filter.tags = { $in: tags };
  if (typeof ratingMin === "number" || typeof ratingMax === "number") {
    filter.rating = {};
    if (typeof ratingMin === "number") filter.rating.$gte = ratingMin;
    if (typeof ratingMax === "number") filter.rating.$lte = ratingMax;
  }
  if (solvedPairs?.length) {
    filter.$nor = solvedPairs.slice(0, 500).map(p => ({ contestId: p.contestId, index: p.index }));
  }

  const docs = await Problem.find(filter)
    .sort({ contestId: -1, rating: 1 }) // prefer recent contests
    .limit(limit * 4)
    .lean();

  return docs
    .filter(d => !excludeIds.has(`${d.contestId}-${d.index}`))
    .slice(0, limit)
    .map(d => ({
      contestId: d.contestId, index: d.index, name: d.name,
      rating: d.rating ?? null, tags: d.tags ?? [],
      problemId: `${d.contestId}-${d.index}`, source: "codeforces",
      difficulty: d.rating ? getDifficultyLabel(d.rating) : null,
    }));
}

// ─── LC Problem Query ───
async function queryLCProblems({ lcTags, difficulty, excludeIds, limit = 1 }) {
  const filter = { paidOnly: false, difficulty };
  if (lcTags?.length) filter.topicTags = { $in: lcTags };

  const total = await LeetcodeProblem.countDocuments(filter);
  if (total === 0) return [];

  const skip = Math.max(0, Math.floor(Math.random() * Math.max(1, total - limit)));
  const docs = await LeetcodeProblem.find(filter).skip(skip).limit(limit * 3).lean();

  return docs
    .filter(d => !excludeIds.has(`lc-${d.frontendId}`))
    .slice(0, limit)
    .map(d => ({
      problemId: `lc-${d.frontendId}`, name: d.title,
      rating: null, difficulty: d.difficulty,
      tags: d.topicTags ?? [], source: "leetcode",
      titleSlug: d.titleSlug, frontendId: d.frontendId,
    }));
}

// ─── Analyze CF submissions → weak tags ───
function analyzeSubmissions(submissions) {
  const problemMap = new Map();
  for (const s of submissions) {
    const p = s.problem;
    if (!p || p.contestId == null || !p.index) continue;
    const key = `${p.contestId}-${p.index}`;
    let entry = problemMap.get(key);
    if (!entry) {
      entry = { contestId: p.contestId, index: p.index, tags: p.tags || [], attempts: 0, solved: false };
      problemMap.set(key, entry);
    }
    entry.attempts += 1;
    if (s.verdict === "OK") entry.solved = true;
  }

  const solvedSet = new Set();
  const tagAttempts = {};
  const tagSolved = {};
  for (const [, e] of problemMap) {
    if (e.solved) solvedSet.add(`${e.contestId}-${e.index}`);
    for (const tag of e.tags) {
      tagAttempts[tag] = (tagAttempts[tag] || 0) + e.attempts;
      tagSolved[tag] = (tagSolved[tag] || 0) + (e.solved ? 1 : 0);
    }
  }

  const tagStats = Object.keys(tagAttempts)
    .map(tag => ({
      tag, attempts: tagAttempts[tag], solved: tagSolved[tag] || 0,
      successRate: tagAttempts[tag] > 0 ? (tagSolved[tag] || 0) / tagAttempts[tag] : 0,
    }))
    .sort((a, b) => a.successRate - b.successRate || b.attempts - a.attempts);

  let weakTags = tagStats.filter(t => t.attempts >= 3).slice(0, 6).map(t => t.tag);
  if (weakTags.length < 3) weakTags = tagStats.slice(0, 6).map(t => t.tag);

  const solvedPairs = Array.from(solvedSet).map(key => {
    const [c, i] = key.split("-");
    return { contestId: Number(c), index: i };
  });

  return { weakTags, solvedPairs, solvedSet };
}

// ─── Main Controller ───
export default async function dailyProblems(req, res) {
  try {
    const handle = req.params?.user;
    if (!handle) return res.status(400).json({ error: "Missing handle" });

    const user = await User.findOne({ handle }).lean();
    if (!user) return res.status(404).json({ error: `User not found: ${handle}` });

    const userRating = typeof user.rating === "number" ? user.rating : 800;
    const cfLinked = user.cfLinked !== false;
    const lcLinked = !!user.lcLinked;
    const cfHandle = user.cfHandle || user.handle;

    // Return cached daily problems if same day
    if (user.dailyProblems?.generatedAt && isSameDayInIST(new Date(user.dailyProblems.generatedAt), new Date())) {
      return res.json({
        handle, rating: userRating, cfLinked, lcLinked,
        problems: user.dailyProblems.items,
        dailyProblems: user.dailyProblems,
        meta: { cached: true },
      });
    }

    // Anti-repeat set
    const recentlyUsed = new Set(user.recentlySuggested || []);
    const collected = [];
    const visited = new Set();

    // ─── CF PROBLEMS ───
    let weakTags = [];
    if (cfLinked) {
      const cacheKey = `cf_submissions:${cfHandle}`;
      let cfSubs = await cacheGet(cacheKey);
      if (!cfSubs) {
        const cfUrl = `https://codeforces.com/api/user.status?handle=${encodeURIComponent(cfHandle)}&from=1&count=1500`;
        const cfResp = await fetch(cfUrl);
        if (cfResp.ok) {
          const cfJson = await cfResp.json();
          if (cfJson.status === "OK") {
            cfSubs = cfJson.result;
            await cacheSet(cacheKey, cfSubs, 600);
          }
        }
      }

      if (cfSubs) {
        const { weakTags: wt, solvedPairs } = analyzeSubmissions(cfSubs);
        weakTags = wt;

        // Difficulty distribution: 2 easy + 3 medium + 2 hard + 1 stretch = 8 if only CF, else 7
        const cfTotal = lcLinked ? 7 : 10;
        const tiers = [
          { min: Math.max(800, userRating - 300), max: Math.max(800, userRating - 100), count: 2, label: "easy" },
          { min: Math.max(800, userRating - 100), max: Math.min(3500, userRating + 100), count: 3, label: "medium" },
          { min: Math.min(3500, userRating + 100), max: Math.min(3500, userRating + 400), count: Math.max(1, cfTotal - 5), label: "hard" },
          { min: Math.min(3500, userRating + 400), max: Math.min(3500, userRating + 700), count: 1, label: "stretch" },
        ];

        for (const tier of tiers) {
          if (collected.length >= cfTotal) break;
          const candidates = await queryCFProblems({
            tags: weakTags, ratingMin: tier.min, ratingMax: tier.max,
            solvedPairs, excludeIds: new Set([...visited, ...recentlyUsed]),
            limit: tier.count,
          });
          for (const p of candidates) {
            if (collected.length >= cfTotal) break;
            if (!visited.has(p.problemId)) {
              visited.add(p.problemId);
              collected.push(p);
            }
          }
        }

        // Fill remaining CF slots
        if (collected.length < cfTotal) {
          const remaining = cfTotal - collected.length;
          const fill = await queryCFProblems({
            tags: [], ratingMin: Math.max(800, userRating - 400), ratingMax: Math.min(3500, userRating + 400),
            solvedPairs, excludeIds: new Set([...visited, ...recentlyUsed]),
            limit: remaining,
          });
          for (const p of fill) {
            if (collected.length >= cfTotal) break;
            if (!visited.has(p.problemId)) { visited.add(p.problemId); collected.push(p); }
          }
        }
      }
    }

    // ─── LC PROBLEMS ───
    if (lcLinked) {
      const lcTotal = cfLinked ? 3 : 10;
      const lcWeakTags = weakTags.map(t => CF_TO_LC_TAGS[t.toLowerCase()]).filter(Boolean);

      // Difficulty mix for LC
      const lcMix = cfLinked
        ? ["Easy", "Medium", "Hard"]
        : ["Easy", "Easy", "Medium", "Medium", "Medium", "Hard", "Hard", "Hard", "Easy", "Medium"];

      for (const diff of lcMix) {
        if (collected.filter(p => p.source === "leetcode").length >= lcTotal) break;
        const lcs = await queryLCProblems({
          lcTags: lcWeakTags.length > 0 ? lcWeakTags : undefined,
          difficulty: diff, excludeIds: new Set([...visited, ...recentlyUsed]),
          limit: 1,
        });
        for (const p of lcs) {
          if (!visited.has(p.problemId)) { visited.add(p.problemId); collected.push(p); }
        }
      }
    }

    // Sort: CF first (by rating asc), then LC (by difficulty)
    const diffOrder = { Easy: 1, Medium: 2, Hard: 3 };
    const finalProblems = collected.slice(0, 10).sort((a, b) => {
      if (a.source !== b.source) return a.source === "codeforces" ? -1 : 1;
      if (a.source === "codeforces") return (a.rating ?? 0) - (b.rating ?? 0);
      return (diffOrder[a.difficulty] || 2) - (diffOrder[b.difficulty] || 2);
    });

    // Update anti-repeat list (keep last 50)
    const newSuggested = [...(user.recentlySuggested || []), ...finalProblems.map(p => p.problemId)].slice(-50);

    const generatedAt = new Date();
    await User.updateOne({ handle }, {
      $set: {
        "dailyProblems.items": finalProblems,
        "dailyProblems.generatedAt": generatedAt,
        recentlySuggested: newSuggested,
      },
    });

    res.json({
      handle, rating: userRating, weakTags, cfLinked, lcLinked,
      problems: finalProblems,
      dailyProblems: { items: finalProblems, generatedAt },
      meta: {
        cached: false,
        cfProblems: finalProblems.filter(p => p.source === "codeforces").length,
        lcProblems: finalProblems.filter(p => p.source === "leetcode").length,
      },
    });
  } catch (err) {
    console.error("dailyProblems error:", err);
    res.status(500).json({ error: "Internal server error", details: err?.message ?? String(err) });
  }
}
