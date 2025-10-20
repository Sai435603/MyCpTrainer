import mongoose from "mongoose";
import User from "../models/User.js";
import Heatmap from "../models/Heatmap.js";

export async function fetchHeatmap(req, res) {
  try {
    const handle = req.params?.user;
    if (!handle) return res.status(400).json({ success: false, error: "User handle required" });

    const user = await User.findOne({ handle }).lean();
    if (!user) return res.status(404).json({ success: false, error: "User not found" });

    const endDate = new Date();
    endDate.setHours(0, 0, 0, 0);
    const startDate = new Date(endDate);
    startDate.setFullYear(startDate.getFullYear() - 1);
    startDate.setDate(startDate.getDate() + 1);

    const cached = await Heatmap.findOne({ handle }).sort({ generatedAt: -1 }).lean();

    if (
      cached &&
      new Date(cached.startDate).toISOString().slice(0, 10) === startDate.toISOString().slice(0, 10) &&
      new Date(cached.endDate).toISOString().slice(0, 10) === endDate.toISOString().slice(0, 10)
    ) {
      return res.status(200).json({
        success: true,
        heatmap: {
          startDate: new Date(cached.startDate).toISOString().slice(0, 10),
          endDate: new Date(cached.endDate).toISOString().slice(0, 10),
          generatedAt: cached.generatedAt,
          values: cached.values,
        },
      });
    }

    const days = [];
    const countsMap = new Map();
    const cur = new Date(startDate);
    while (cur <= endDate) {
      const iso = cur.toISOString().slice(0, 10);
      days.push(iso);
      countsMap.set(iso, 0);
      cur.setDate(cur.getDate() + 1);
    }

    const modelNames = mongoose.modelNames();
    if (modelNames.includes("Submission")) {
      const Submission = mongoose.model("Submission");

      try {
        const matchA = {
          verdict: "OK",
          creationTimeSeconds: { $gte: Math.floor(startDate.getTime() / 1000) },
        };
        if (Submission.schema.path("handle")) matchA.handle = handle;
        else if (Submission.schema.path("userHandle")) matchA.userHandle = handle;
        else if (Submission.schema.path("authorHandle")) matchA.authorHandle = handle;

        const aggA = await Submission.aggregate([
          { $match: matchA },
          {
            $project: {
              day: {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: { $toDate: { $multiply: ["$creationTimeSeconds", 1000] } },
                },
              },
            },
          },
          { $group: { _id: "$day", count: { $sum: 1 } } },
        ]);

        if (aggA?.length) aggA.forEach((r) => countsMap.set(r._id, (countsMap.get(r._id) || 0) + r.count));
      } catch {}

      try {
        const matchB = { verdict: "OK", createdAt: { $gte: startDate } };
        if (Submission.schema.path("user")) matchB.user = user._id;
        else if (Submission.schema.path("handle")) matchB.handle = handle;
        else if (Submission.schema.path("userHandle")) matchB.userHandle = handle;
        else if (Submission.schema.path("authorHandle")) matchB.authorHandle = handle;

        const aggB = await Submission.aggregate([
          { $match: matchB },
          {
            $project: {
              day: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            },
          },
          { $group: { _id: "$day", count: { $sum: 1 } } },
        ]);

        if (aggB?.length) aggB.forEach((r) => countsMap.set(r._id, (countsMap.get(r._id) || 0) + r.count));
      } catch {}
    }

    const values = days.map((d) => ({ date: d, count: countsMap.get(d) || 0 }));

    const heatmapDoc = new Heatmap({
      user: user._id,
      handle: user.handle,
      startDate,
      endDate,
      values,
      generatedAt: new Date(),
    });
    await heatmapDoc.save();

    res.status(200).json({
      success: true,
      heatmap: {
        startDate: startDate.toISOString().slice(0, 10),
        endDate: endDate.toISOString().slice(0, 10),
        generatedAt: heatmapDoc.generatedAt,
        values,
      },
    });
  } catch (err) {
    console.error("fetchHeatmap error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

export default fetchHeatmap;
