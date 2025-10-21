import Heatmap from "../models/Heatmap.js";

export async function fetchHeatmap(req, res) {
  try {
    const handle = req.params?.user;
    if (!handle) {
      return res
        .status(400)
        .json({ success: false, error: "User handle required" });
    }

 
    const cachedHeatmap = await Heatmap.findOne({ handle })
      .sort({ generatedAt: -1 }) 
      .lean();

    if (!cachedHeatmap) {
      return res.status(200).json({ success: true, heatmap: null });
    }

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