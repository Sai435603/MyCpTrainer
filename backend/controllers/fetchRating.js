import fetch from "node-fetch";

/**
 * GET /api/rating/:user — Codeforces rating history
 */
async function fetchRating(req, res) {
  try {
    const handle = req.params?.user;
    if (!handle) return res.status(400).json({ error: "Codeforces handle is required" });

    const cfUrl = `https://codeforces.com/api/user.rating?handle=${encodeURIComponent(handle)}`;
    const cfResponse = await fetch(cfUrl);
    if (!cfResponse.ok) return res.status(502).json({ error: "Failed to fetch data from Codeforces API" });

    const cfJson = await cfResponse.json();
    if (cfJson.status !== "OK") {
      return res.status(404).json({ error: `User not found or API error: ${cfJson.comment}` });
    }

    const formattedRatings = cfJson.result.map(item => ({
      contestName: item.contestName,
      rank: item.rank,
      rating: item.newRating,
      date: new Date(item.ratingUpdateTimeSeconds * 1000).toISOString(),
    }));
    return res.status(200).json(formattedRatings);
  } catch (err) {
    console.error("Error in fetchRating:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * GET /api/lc-rating/:user — LeetCode contest rating history
 * Uses LeetCode's public GraphQL API.
 */
async function fetchLCRating(req, res) {
  try {
    const lcHandle = req.params?.user;
    if (!lcHandle) return res.status(400).json({ error: "LeetCode handle is required" });

    const query = {
      query: `query userContestRankingInfo($username: String!) {
        userContestRankingHistory(username: $username) {
          attended
          rating
          ranking
          contest {
            title
            startTime
          }
        }
      }`,
      variables: { username: lcHandle },
    };

    const lcRes = await fetch("https://leetcode.com/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(query),
    });

    if (!lcRes.ok) {
      return res.status(502).json({ error: "Failed to fetch data from LeetCode API" });
    }

    const lcJson = await lcRes.json();
    const history = lcJson?.data?.userContestRankingHistory;

    if (!history || !Array.isArray(history)) {
      return res.status(200).json([]);
    }

    // Filter only attended contests and format
    const formattedRatings = history
      .filter(item => item.attended)
      .map(item => ({
        contestName: item.contest?.title || "Unknown Contest",
        rank: item.ranking,
        rating: Math.round(item.rating),
        date: item.contest?.startTime
          ? new Date(item.contest.startTime * 1000).toISOString()
          : new Date().toISOString(),
      }));

    return res.status(200).json(formattedRatings);
  } catch (err) {
    console.error("Error in fetchLCRating:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export default fetchRating;
export { fetchLCRating };
