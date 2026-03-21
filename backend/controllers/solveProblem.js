import User from "../models/User.js";
import Heatmap from "../models/Heatmap.js";

/**
 * POST /api/problems/solve
 * Body: { problemId: string }
 *
 * Marks a daily problem as solved in the app.
 * Updates the app-level heatmap and recalculates the streak.
 */
export default async function solveProblem(req, res) {
  try {
    const { id: userId } = req.user;
    const { problemId } = req.body || {};

    if (!problemId) {
      return res.status(400).json({ message: "problemId is required." });
    }

    // 1. Mark the problem as solved in user's daily list
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found." });

    let found = false;
    if (user.dailyProblems?.items) {
      for (const p of user.dailyProblems.items) {
        if (p.problemId === problemId && !p.isSolved) {
          p.isSolved = true;
          found = true;
          break;
        }
      }
    }

    if (!found) {
      // Already solved or not in today's list
      return res.status(200).json({ message: "Problem already solved or not found in today's list.", alreadySolved: true });
    }

    await user.save();

    // 2. Update app-level heatmap — add +1 to today's count
    const todayStr = new Date().toISOString().slice(0, 10);

    const heatmap = await Heatmap.findOne({ user: userId });
    if (heatmap) {
      const existing = heatmap.values.find(v => v.date === todayStr);
      if (existing) {
        existing.count += 1;
      } else {
        heatmap.values.push({ date: todayStr, count: 1 });
      }
      heatmap.generatedAt = new Date();
      heatmap.endDate = new Date();
      await heatmap.save();
    } else {
      // First ever entry
      await Heatmap.create({
        user: userId,
        handle: user.handle,
        startDate: new Date(new Date().setFullYear(new Date().getFullYear() - 1)),
        endDate: new Date(),
        values: [{ date: todayStr, count: 1 }],
        generatedAt: new Date(),
      });
    }

    // 3. Recalculate streak from app heatmap
    const updatedHeatmap = await Heatmap.findOne({ user: userId }).lean();
    const daysWithActivity = new Set((updatedHeatmap?.values || []).filter(v => v.count > 0).map(v => v.date));

    let streak = 0;
    const curDate = new Date();
    const todayCheck = curDate.toISOString().slice(0, 10);
    const yesterdayDate = new Date(curDate);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayCheck = yesterdayDate.toISOString().slice(0, 10);

    if (!daysWithActivity.has(todayCheck) && !daysWithActivity.has(yesterdayCheck)) {
      streak = 0;
    } else {
      const walkDate = new Date();
      while (daysWithActivity.has(walkDate.toISOString().slice(0, 10))) {
        streak++;
        walkDate.setDate(walkDate.getDate() - 1);
      }
    }

    await User.updateOne({ _id: userId }, { $set: { streak } });

    return res.json({
      message: "Problem marked as solved!",
      problemId,
      streak,
      solvedToday: (updatedHeatmap?.values || []).find(v => v.date === todayStr)?.count || 1,
    });
  } catch (err) {
    console.error("solveProblem error:", err);
    return res.status(500).json({ message: "Server error." });
  }
}
