import fetch from 'node-fetch';
import User from '../models/User.js';
import Heatmap from '../models/Heatmap.js';

async function getAcceptedSubmissions(handle) {
    const url = `https://codeforces.com/api/user.status?handle=${handle}`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Codeforces API responded with status: ${response.status}`);
        const data = await response.json();
        if (data.status !== 'OK') throw new Error(`Codeforces API error: ${data.comment}`);
        return data.result.filter(sub => sub.verdict === 'OK');
    } catch (error) {
        console.error(`Failed to fetch submissions for ${handle}:`, error);
        throw error;
    }
}

function calculateHeatmapValues(acceptedSubmissions) {
    const submissionCounts = new Map();
    for (const sub of acceptedSubmissions) {
        const dateString = new Date(sub.creationTimeSeconds * 1000).toISOString().slice(0, 10);
        submissionCounts.set(dateString, (submissionCounts.get(dateString) || 0) + 1);
    }
    return Array.from(submissionCounts.entries()).map(([date, count]) => ({ date, count }));
}


function calculateStreak(acceptedSubmissions) {
    if (acceptedSubmissions.length === 0) return 0;
    const uniqueSubmissionDays = new Set();
    for (const sub of acceptedSubmissions) {
        const dateString = new Date(sub.creationTimeSeconds * 1000).toISOString().slice(0, 10);
        uniqueSubmissionDays.add(dateString);
    }
    let streak = 0;
    let currentDate = new Date();
    const todayStr = currentDate.toISOString().slice(0, 10);
    currentDate.setDate(currentDate.getDate() - 1);
    const yesterdayStr = currentDate.toISOString().slice(0, 10);
    currentDate = new Date(); 
    if (!uniqueSubmissionDays.has(todayStr) && !uniqueSubmissionDays.has(yesterdayStr)) {
        return 0;
    }
    while (uniqueSubmissionDays.has(currentDate.toISOString().slice(0, 10))) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
    }
    return streak;
}


async function syncProfile(req, res) {
    try {
        const { handle, id: userId } = req.user;

        // 1. Fetch ALL submissions for complete accuracy
        const acceptedSubmissions = await getAcceptedSubmissions(handle);

        // 2. Accurately calculate stats from the complete data
        const streak = calculateStreak(acceptedSubmissions);
        const heatmapValues = calculateHeatmapValues(acceptedSubmissions);

        // 3. Update the database
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        const solvedProblemIds = new Set(
            acceptedSubmissions.map(sub => `${sub.problem.contestId}-${sub.problem.index}`)
        );

        user.dailyProblems.items.forEach(problem => {
            const problemId = `${problem.contestId}-${problem.index}`;
            if (solvedProblemIds.has(problemId)) {
                problem.isSolved = true;
            }
        });
        
        user.streak = streak;
        const updatedUser = await user.save();
        
        const updatedHeatmap = await Heatmap.findOneAndUpdate(
            { user: userId },
            {
                $set: {
                    handle: handle,
                    values: heatmapValues,
                    generatedAt: new Date(),
                    startDate: new Date(new Date().setFullYear(new Date().getFullYear() - 1)),
                    endDate: new Date(),
                }
            },
            { new: true, upsert: true }
        ).lean();

       
        const userPayload = {
            _id: updatedUser._id,
            handle: updatedUser.handle,
            streak: updatedUser.streak,
            dailyProblems: updatedUser.dailyProblems,
        };

        res.status(200).json({
            message: "Profile synced successfully",
            user: userPayload, 
            heatmap: updatedHeatmap
        });

    } catch (error) {
        console.error("Error during profile sync:", error);
        res.status(500).json({ message: "Server error during sync." });
    }
}

export default syncProfile;