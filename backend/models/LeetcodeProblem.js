import { Schema, model } from "mongoose";

const LeetcodeProblemSchema = new Schema(
  {
    frontendId: { type: Number, required: true, unique: true, index: true },
    titleSlug: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    difficulty: { type: String, enum: ["Easy", "Medium", "Hard"], required: true, index: true },
    topicTags: [String],
    paidOnly: { type: Boolean, default: false },
  },
  { timestamps: true }
);

LeetcodeProblemSchema.index({ difficulty: 1, paidOnly: 1 });
const LeetcodeProblem = model("LeetcodeProblem", LeetcodeProblemSchema);
export default LeetcodeProblem;
