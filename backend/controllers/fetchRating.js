import fetch from "node-fetch";

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

export default fetchRating;
