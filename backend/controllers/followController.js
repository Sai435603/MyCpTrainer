import User from "../models/User.js";

/**
 * GET /api/friends/search?q=term
 * Search users by handle prefix (autocomplete). Excludes the requester.
 */
export async function searchUsers(req, res) {
  try {
    const q = (req.query.q || "").trim();
    if (!q || q.length < 2) {
      return res.json([]);
    }

    const currentHandle = req.user?.handle;

    const users = await User.find({
      handle: { $regex: `^${q}`, $options: "i" },
      ...(currentHandle ? { handle: { $regex: `^${q}`, $options: "i", $ne: currentHandle } } : {}),
    })
      .select("handle rating streak")
      .limit(10)
      .lean();

    // Filter out current user in JS to be safe
    const filtered = currentHandle
      ? users.filter((u) => u.handle !== currentHandle)
      : users;

    res.json(filtered);
  } catch (err) {
    console.error("searchUsers error:", err);
    res.status(500).json({ message: "Failed to search users." });
  }
}

/**
 * POST /api/friends/follow   { handle: "targetHandle" }
 * Follow a user.
 */
export async function followUser(req, res) {
  try {
    const currentHandle = req.user?.handle;
    const { handle: targetHandle } = req.body;

    if (!targetHandle) {
      return res.status(400).json({ message: "Handle is required." });
    }

    if (targetHandle === currentHandle) {
      return res.status(400).json({ message: "You cannot follow yourself." });
    }

    // Verify target user exists
    const targetUser = await User.findOne({ handle: targetHandle }).lean();
    if (!targetUser) {
      return res.status(404).json({ message: "User not found." });
    }

    // Add to following (avoid duplicates with $addToSet)
    await User.updateOne(
      { handle: currentHandle },
      { $addToSet: { following: targetHandle } }
    );

    res.json({ message: `Now following ${targetHandle}.`, following: targetHandle });
  } catch (err) {
    console.error("followUser error:", err);
    res.status(500).json({ message: "Failed to follow user." });
  }
}

/**
 * POST /api/friends/unfollow   { handle: "targetHandle" }
 * Unfollow a user.
 */
export async function unfollowUser(req, res) {
  try {
    const currentHandle = req.user?.handle;
    const { handle: targetHandle } = req.body;

    if (!targetHandle) {
      return res.status(400).json({ message: "Handle is required." });
    }

    await User.updateOne(
      { handle: currentHandle },
      { $pull: { following: targetHandle } }
    );

    res.json({ message: `Unfollowed ${targetHandle}.` });
  } catch (err) {
    console.error("unfollowUser error:", err);
    res.status(500).json({ message: "Failed to unfollow user." });
  }
}

/**
 * GET /api/friends
 * Get the current user's following list with each friend's stats.
 */
export async function getFriends(req, res) {
  try {
    const currentHandle = req.user?.handle;

    const currentUser = await User.findOne({ handle: currentHandle })
      .select("following")
      .lean();

    if (!currentUser || !currentUser.following?.length) {
      return res.json([]);
    }

    const friends = await User.find({
      handle: { $in: currentUser.following },
    })
      .select("handle rating streak cfHandle lcHandle")
      .lean();

    res.json(friends);
  } catch (err) {
    console.error("getFriends error:", err);
    res.status(500).json({ message: "Failed to fetch friends." });
  }
}
