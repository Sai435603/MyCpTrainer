import mongoose from 'mongoose';
const { Schema } = mongoose;

const DailyProblemItem = new Schema({
  problemId: { type: String, required: true },
  contestId: Number,
  index: String,
  name: String,
  rating: Number,
  difficulty: String,
  isSolved: { type: Boolean, default: false },
  tags: [String],
  source: { type: String, enum: ["codeforces", "leetcode"], default: "codeforces" },
  titleSlug: String,
  frontendId: Number,
}, { _id: false });

const DailyProblemsSchema = new Schema({
  items: { type: [DailyProblemItem], default: [] },
  generatedAt: { type: Date, default: null }
}, { _id: false });

const UserSchema = new Schema({

  handle: { type: String, required: true, unique: true, index: true },
  passwordHash: { type: String, required: true },
  rating: { type: Number, default: 800, index: true },
  dailyProblems: { type: DailyProblemsSchema, default: () => ({ items: [], generatedAt: null }) },
  streak: { type: Number, default: 0, index: true },

  // Profile linking
  cfHandle: { type: String, default: null },
  lcHandle: { type: String, default: null },
  cfLinked: { type: Boolean, default: false },
  lcLinked: { type: Boolean, default: false },

  // Anti-repeat: track recently suggested problem IDs
  recentlySuggested: { type: [String], default: [] },

  // Social: users this person follows (by handle)
  following: { type: [String], default: [] },

}, { timestamps: true });

UserSchema.index({ rating: -1 });
const User = mongoose.model('User', UserSchema);
export default User;
