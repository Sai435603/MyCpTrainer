import { Schema, model } from "mongoose";

const ProblemSchema = new Schema(
  {
    contestId: { type: Number, required: true },
    index: { type: String, required: true },
    name: { type: String, required: true },
    problemType: String,
    rating: Number,
    tags: [String],
  },
  { timestamps: true }
);

ProblemSchema.index({ contestId: 1, index: 1 }, { unique: true });
const Problem = model("Problem", ProblemSchema);
export default Problem;
