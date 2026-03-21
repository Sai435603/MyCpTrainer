import Problem from "../models/Problem.js";

async function fetchLoginChallenge(req, res) {
  try {
    const handle = req.query?.handle;
    if (!handle || !handle.trim()) {
      return res.status(400).json({ message: "Handle is required." });
    }

    // Verify the CF handle exists
    try {
      const cfRes = await fetch(`https://codeforces.com/api/user.info?handles=${encodeURIComponent(handle.trim())}`);
      const cfData = await cfRes.json();
      if (cfData.status !== "OK") {
        return res.status(404).json({ message: `Codeforces handle "${handle.trim()}" not found.` });
      }
    } catch {
      return res.status(502).json({ message: "Could not verify handle with Codeforces." });
    }

    // Find a random problem for the challenge
    const problems = await Problem.aggregate([{ $sample: { size: 1 } }]);
    if (!problems || problems.length === 0) {
      // Fallback: use a well-known easy problem
      return res.status(200).json({
        questionUrl: "https://codeforces.com/problemset/problem/1/A",
        duration: 300,
      });
    }

    const p = problems[0];
    const questionUrl = `https://codeforces.com/problemset/problem/${p.contestId}/${p.index}`;
    res.status(200).json({ questionUrl, duration: 300 });
  } catch (err) {
    console.error("fetchLoginChallenge error:", err);
    res.status(500).json({ message: "Server error generating challenge." });
  }
}

export default fetchLoginChallenge;
