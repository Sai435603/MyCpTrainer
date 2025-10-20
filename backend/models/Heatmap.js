// models/Heatmap.js
import mongoose from "mongoose";
const { Schema, model } = mongoose;

const HeatmapValue = new Schema(
  {
    date: { type: String, required: true }, 
    count: { type: Number, required: true, default: 0 },
  },
  { _id: false }
);

const HeatmapSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    handle: { type: String, required: true, index: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    values: { type: [HeatmapValue], default: [] },
    generatedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

HeatmapSchema.index({ user: 1, generatedAt: -1 });

const Heatmap = model("Heatmap", HeatmapSchema);
export default Heatmap;
