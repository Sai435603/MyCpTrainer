import Heatmap from "../models/Heatmap.js";
import User from "../models/User.js";

export async function fetchHeatmap(req, res) {
  try {
    const handle = req.params?.user;
    if (!handle) {
      return res.status(400).json({ success: false, error: "User handle required" });
    }

    // Look up by user ObjectId for app-level heatmap
    const user = await User.findOne({ handle }).select("_id").lean();
    if (!user) {
      return res.status(200).json({ success: true, heatmap: null });
    }

    const heatmap = await Heatmap.findOne({ user: user._id })
      .sort({ generatedAt: -1 })
      .lean();

    if (!heatmap) {
      // No heatmap yet — return empty one (1 year range)
      const end = new Date();
      const start = new Date(end);
      start.setFullYear(start.getFullYear() - 1);
      return res.status(200).json({
        success: true,
        heatmap: {
          startDate: start,
          endDate: end,
          values: [],
          appOnly: true,
        },
      });
    }

    return res.status(200).json({
      success: true,
      heatmap: {
        startDate: heatmap.startDate,
        endDate: heatmap.endDate,
        generatedAt: heatmap.generatedAt,
        values: heatmap.values,
        appOnly: true,
      },
    });
    
  } catch (err) {
    console.error("fetchHeatmap error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

/**
 * POST /api/heatmap/reset
 * Clears heatmap data for the current user (removes old CF-populated data)
 */
export async function resetHeatmap(req, res) {
  try {
    const userId = req.user.id;
    
    // Delete all old heatmap records for this user
    await Heatmap.deleteMany({ user: userId });

    return res.json({ message: "Heatmap reset. It will now track only app-level solves." });
  } catch (err) {
    console.error("resetHeatmap error:", err);
    res.status(500).json({ message: "Server error." });
  }
}

export default fetchHeatmap;