import fetch from 'node-fetch';
import User from '../models/User.js';
import { cacheGet, cacheSet } from '../utils/redis.js';

async function getAcceptedSubmissions(handle) {
    const cacheKey = `sync_subs:${handle}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return cached;

    const url = `https://codeforces.com/api/user.status?handle=${handle}`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Codeforces API responded with status: ${response.status}`);
        const data = await response.json();
        if (data.status !== 'OK') throw new Error(`Codeforces API error: ${data.comment}`);
        const accepted = data.result.filter(sub => sub.verdict === 'OK');
        await cacheSet(cacheKey, accepted, 300);
        return accepted;
    } catch (error) {
        console.error(`Failed to fetch submissions for ${handle}:`, error);
        throw error;
    }
}


async function syncProfile(req, res) {
    try {
        const { handle, id: userId } = req.user;
        const cfHandle = handle;

        // 1. Fetch CF submissions to check which daily CF problems are solved
        let solvedProblemIds = new Set();
        try {
            const acceptedSubmissions = await getAcceptedSubmissions(cfHandle);
            solvedProblemIds = new Set(
                acceptedSubmissions.map(sub => `${sub.problem.contestId}-${sub.problem.index}`)
            );
        } catch {
            console.warn("Could not fetch CF submissions for sync, skipping CF solve check.");
        }

        // 2. Update isSolved for CF daily problems only (not heatmap)
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        if (user.dailyProblems && Array.isArray(user.dailyProblems.items)) {
            user.dailyProblems.items.forEach(problem => {
                if (problem.source === "leetcode") return; // Can't check LC from CF API
                const problemId = `${problem.contestId}-${problem.index}`;
                if (solvedProblemIds.has(problemId)) {
                    problem.isSolved = true;
                }
            });
        }

        const updatedUser = await user.save();

        // NOTE: Heatmap is NOT updated here — it's app-level only.
        // The heatmap updates when users mark problems as solved via POST /api/problems/solve

        res.status(200).json({
            message: "Profile synced successfully",
            user: {
                _id: updatedUser._id,
                handle: updatedUser.handle,
                streak: updatedUser.streak,
                rating: updatedUser.rating,
                dailyProblems: updatedUser.dailyProblems,
            },
        });

    } catch (error) {
        console.error("Error during profile sync:", error);
        res.status(500).json({ message: "Server error during sync." });
    }
}

export default syncProfile;