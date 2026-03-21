import User from "../models/User.js";

export default async function verifySession(req, res) {
  try {
    // JWT already decoded by authMiddleware into req.user
    // Fetch fresh streak from DB for accuracy, but do it fast
    const freshData = await User.findById(req.user.id)
      .select("handle streak rating")
      .lean();

    if (!freshData) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.status(200).json({
      message: "User is authenticated.",
      user: {
        id: req.user.id,
        handle: freshData.handle,
        streak: freshData.streak || 0,
        rating: freshData.rating || 800,
      },
    });
  } catch (error) {
    console.error("Error in verifySession:", error);
    // Even if DB lookup fails, the JWT is valid — return the JWT data
    return res.status(200).json({
      message: "User is authenticated.",
      user: req.user,
    });
  }
}