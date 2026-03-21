import { cacheGet, cacheSet } from "../utils/redis.js";

const CF_API_URL = "https://codeforces.com/api/user.status?handle=";
const SUBMISSION_COUNT = 100000;
const CACHE_TTL = 300; // 5 minutes

async function fetchAnalytics(req, res) {
  const { handle } = req.user;

  if (handle !== req.params.user) {
    return res
      .status(403)
      .json({ error: "You can only view your own analytics." });
  }

  try {
    // Try cached data first
    const cacheKey = `analytics:${handle}`;
    const cachedData = await cacheGet(cacheKey);

    if (cachedData) {
      return res.json({ result: cachedData });
    }

    const resp = await fetch(
      `${CF_API_URL}${handle}&from=1&count=${SUBMISSION_COUNT}`
    );
    if (!resp.ok) {
      return res
        .status(502)
        .json({ error: "Failed to fetch from Codeforces API" });
    }
    const data = await resp.json();
    if (data.status !== "OK" || !Array.isArray(data.result)) {
      return res
        .status(502)
        .json({ error: "Unexpected response from Codeforces API", raw: data });
    }

    // Cache the result
    await cacheSet(cacheKey, data.result, CACHE_TTL);

    return res.json({ result: data.result });
  } catch (err) {
    console.error(`Error in fetchAnalytics for ${handle}:`, err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export default fetchAnalytics;
