import User from "../models/User.js";

/**
 * GET /api/profile — return linked profiles
 */
export async function getProfile(req, res) {
  try {
    const user = await User.findById(req.user.id)
      .select("handle cfHandle lcHandle cfLinked lcLinked rating streak")
      .lean();
    if (!user) return res.status(404).json({ message: "User not found." });

    return res.json({
      handle: user.handle,
      cfHandle: user.cfHandle || null,
      lcHandle: user.lcHandle || null,
      cfLinked: !!user.cfLinked,
      lcLinked: !!user.lcLinked,
      rating: user.rating || 800,
      streak: user.streak || 0,
    });
  } catch (err) {
    console.error("getProfile error:", err);
    return res.status(500).json({ message: "Server error." });
  }
}

/**
 * PUT /api/profile/link — link a platform handle
 * Body: { platform: "leetcode" | "codeforces", handle: "..." }
 */
export async function linkProfile(req, res) {
  try {
    const { platform, handle } = req.body || {};
    if (!platform || !handle) {
      return res.status(400).json({ message: "platform and handle are required." });
    }

    const trimmed = handle.trim();
    if (trimmed.length < 1 || trimmed.length > 50) {
      return res.status(400).json({ message: "Handle must be 1-50 characters." });
    }

    const update = {};
    if (platform === "leetcode") {
      update.lcHandle = trimmed;
      update.lcLinked = true;
    } else if (platform === "codeforces") {
      // Verify handle exists on CF
      try {
        const cfRes = await fetch(`https://codeforces.com/api/user.info?handles=${encodeURIComponent(trimmed)}`);
        const cfData = await cfRes.json();
        if (cfData.status !== "OK") {
          return res.status(400).json({ message: `Codeforces handle "${trimmed}" not found.` });
        }
      } catch {
        return res.status(502).json({ message: "Could not verify Codeforces handle." });
      }
      update.cfHandle = trimmed;
      update.cfLinked = true;
    } else {
      return res.status(400).json({ message: "platform must be 'leetcode' or 'codeforces'." });
    }

    // Clear daily problems so they regenerate with the new platform's problems
    update["dailyProblems.generatedAt"] = null;

    const user = await User.findByIdAndUpdate(req.user.id, { $set: update }, { new: true })
      .select("handle cfHandle lcHandle cfLinked lcLinked")
      .lean();

    if (!user) return res.status(404).json({ message: "User not found." });

    return res.json({
      message: `${platform} profile linked successfully.`,
      cfHandle: user.cfHandle || user.handle,
      lcHandle: user.lcHandle || null,
      cfLinked: user.cfLinked !== false,
      lcLinked: !!user.lcLinked,
    });
  } catch (err) {
    console.error("linkProfile error:", err);
    return res.status(500).json({ message: "Server error." });
  }
}

/**
 * DELETE /api/profile/link — unlink a platform
 * Body: { platform: "leetcode" | "codeforces" }
 */
export async function unlinkProfile(req, res) {
  try {
    const { platform } = req.body || {};
    if (!platform) return res.status(400).json({ message: "platform is required." });

    const update = {};
    if (platform === "leetcode") {
      update.lcHandle = null;
      update.lcLinked = false;
    } else if (platform === "codeforces") {
      update.cfHandle = null;
      update.cfLinked = false;
    } else {
      return res.status(400).json({ message: "platform must be 'leetcode' or 'codeforces'." });
    }

    // Clear daily problems so they regenerate without this platform's problems
    update["dailyProblems.generatedAt"] = null;

    await User.findByIdAndUpdate(req.user.id, { $set: update });

    return res.json({ message: `${platform} profile unlinked.` });
  } catch (err) {
    console.error("unlinkProfile error:", err);
    return res.status(500).json({ message: "Server error." });
  }
}
