import Problem from "../models/Problem.js";
import User from "../models/User.js";

/**
 * GET /api/challenge?handle=xxx
 * Now only used for password reset — verifies the user exists and has a CF handle linked,
 * then returns a random CF problem for the compilation error challenge.
 */
async function fetchLoginChallenge(req, res) {
  try {
    const handle = req.query?.handle;
    if (!handle || !handle.trim()) {
      return res.status(400).json({ message: "Username is required." });
    }

    // Check user exists
    const user = await User.findOne({ handle: handle.trim() }).select("cfHandle cfLinked").lean();
    if (!user) {
      return res.status(404).json({ message: `User "${handle.trim()}" not found.` });
    }

    // For password reset, user must have CF linked
    const cfHandle = user.cfHandle || handle.trim();
    if (!user.cfLinked || !user.cfHandle) {
      return res.status(400).json({
        message: "No Codeforces profile linked. Cannot verify identity for password reset.",
      });
    }

    // Verify the CF handle exists
    try {
      const cfRes = await fetch(`https://codeforces.com/api/user.info?handles=${encodeURIComponent(cfHandle)}`);
      const cfData = await cfRes.json();
      if (cfData.status !== "OK") {
        return res.status(404).json({ message: `Codeforces handle "${cfHandle}" not found.` });
      }
    } catch {
      return res.status(502).json({ message: "Could not verify handle with Codeforces." });
    }

    // Find a random problem for the challenge
    const problems = await Problem.aggregate([{ $sample: { size: 1 } }]);
    if (!problems || problems.length === 0) {
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
