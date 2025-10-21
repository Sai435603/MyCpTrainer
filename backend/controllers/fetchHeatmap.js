import Heatmap from "../models/Heatmap.js";

export async function fetchHeatmap(req, res) {
  try {
    const handle = req.params?.user;
    if (!handle) {
      return res
        .status(400)
        .json({ success: false, error: "User handle required" });
    }

    // --- CORRECTED LOGIC ---
    // The ONLY task is to find the latest heatmap saved by the sync function.
    // All the complex date logic and flawed aggregation is removed.

    const cachedHeatmap = await Heatmap.findOne({ handle })
      .sort({ generatedAt: -1 }) // Get the most recent one
      .lean();

    // If no heatmap is found (e.g., a new user who hasn't synced yet),
    // return a successful response with null data. 
    // Your frontend will correctly show a default empty grid.
    if (!cachedHeatmap) {
      return res.status(200).json({ success: true, heatmap: null });
    }

    // If a cached heatmap is found, return it immediately. This is the correct data.
    return res.status(200).json({
      success: true,
      heatmap: {
        startDate: cachedHeatmap.startDate,
        endDate: cachedHeatmap.endDate,
        generatedAt: cachedHeatmap.generatedAt,
        values: cachedHeatmap.values,
      },
    });
    
  } catch (err) {
    console.error("fetchHeatmap error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export default fetchHeatmap;