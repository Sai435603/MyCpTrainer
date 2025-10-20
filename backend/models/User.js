import mongoose from 'mongoose';
const { Schema } = mongoose;

const DailyProblemItem = new Schema({
  problemId: { type: String, required: true },
  contestId: Number,
  index: String,
  name: String,
  rating: Number,
  tags: [String]
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
  streak: { type: Number, default: 0, index: true }

}, { timestamps: true });

UserSchema.index({ rating: -1 });
const User = mongoose.model('User', UserSchema);
export default User;
