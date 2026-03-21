import fetch from 'node-fetch';
import User from '../models/User.js';
import Heatmap from '../models/Heatmap.js';
import { cacheGet, cacheSet } from '../utils/redis.js';

// ─── Fetch CF accepted submissions ───
async function getCFAcceptedSubmissions(handle) {
    const cacheKey = `sync_subs:${handle}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return cached;

    const url = `https://codeforces.com/api/user.status?handle=${encodeURIComponent(handle)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`CF API ${response.status}`);
    const data = await response.json();
    if (data.status !== 'OK') throw new Error(`CF API: ${data.comment}`);
    const accepted = data.result.filter(sub => sub.verdict === 'OK');
    await cacheSet(cacheKey, accepted, 300);
    return accepted;
}

// ─── Fetch LC recent accepted submissions (public GraphQL) ───
async function getLCAcceptedSlugs(lcHandle) {
    const cacheKey = `lc_ac:${lcHandle}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return cached;

    const query = {
        query: `query recentAcSubmissions($username: String!, $limit: Int!) {
            recentAcSubmissionList(username: $username, limit: $limit) {
                titleSlug
                timestamp
            }
        }`,
        variables: { username: lcHandle, limit: 50 },
    };

    try {
        const res = await fetch('https://leetcode.com/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(query),
        });
        if (!res.ok) return [];
        const json = await res.json();
        const slugs = (json?.data?.recentAcSubmissionList || []).map(s => s.titleSlug);
        await cacheSet(cacheKey, slugs, 300);
        return slugs;
    } catch (err) {
        console.warn('LC GraphQL fetch failed:', err.message);
        return [];
    }
}

// ─── Update app heatmap ───
async function addToHeatmap(userId, handle, count) {
    if (count <= 0) return;
    const todayStr = new Date().toISOString().slice(0, 10);

    const heatmap = await Heatmap.findOne({ user: userId });
    if (heatmap) {
        const existing = heatmap.values.find(v => v.date === todayStr);
        if (existing) {
            existing.count += count;
        } else {
            heatmap.values.push({ date: todayStr, count });
        }
        heatmap.generatedAt = new Date();
        heatmap.endDate = new Date();
        await heatmap.save();
    } else {
        await Heatmap.create({
            user: userId,
            handle,
            startDate: new Date(new Date().setFullYear(new Date().getFullYear() - 1)),
            endDate: new Date(),
            values: [{ date: todayStr, count }],
            generatedAt: new Date(),
        });
    }
}

// ─── Calculate streak from app heatmap ───
async function calculateAppStreak(userId) {
    const heatmap = await Heatmap.findOne({ user: userId }).lean();
    if (!heatmap?.values?.length) return 0;

    const daysWithActivity = new Set(
        heatmap.values.filter(v => v.count > 0).map(v => v.date)
    );

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    if (!daysWithActivity.has(todayStr) && !daysWithActivity.has(yesterdayStr)) return 0;

    let streak = 0;
    const walkDate = new Date();
    while (daysWithActivity.has(walkDate.toISOString().slice(0, 10))) {
        streak++;
        walkDate.setDate(walkDate.getDate() - 1);
    }
    return streak;
}

// ─── Main sync controller ───
async function syncProfile(req, res) {
    try {
        const { handle, id: userId } = req.user;

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found." });

        const cfHandle = user.cfHandle || handle;
        const lcHandle = user.lcHandle;
        const cfLinked = user.cfLinked !== false;
        const lcLinked = !!user.lcLinked && !!lcHandle;

        let newlySolved = 0;

        // ─── Check CF solved status ───
        if (cfLinked) {
            try {
                const cfSubs = await getCFAcceptedSubmissions(cfHandle);
                const solvedIds = new Set(
                    cfSubs.map(sub => `${sub.problem.contestId}-${sub.problem.index}`)
                );

                if (user.dailyProblems?.items) {
                    for (const p of user.dailyProblems.items) {
                        if (p.source === "leetcode") continue;
                        const pid = `${p.contestId}-${p.index}`;
                        if (!p.isSolved && solvedIds.has(pid)) {
                            p.isSolved = true;
                            newlySolved++;
                        }
                    }
                }
            } catch (err) {
                console.warn("CF sync check failed:", err.message);
            }
        }

        // ─── Check LC solved status ───
        if (lcLinked) {
            try {
                const solvedSlugs = await getLCAcceptedSlugs(lcHandle);
                const slugSet = new Set(solvedSlugs);

                if (user.dailyProblems?.items) {
                    for (const p of user.dailyProblems.items) {
                        if (p.source !== "leetcode") continue;
                        // Match by titleSlug
                        const slug = p.titleSlug || p.name?.toLowerCase().replace(/\s+/g, '-');
                        if (!p.isSolved && slug && slugSet.has(slug)) {
                            p.isSolved = true;
                            newlySolved++;
                        }
                    }
                }
            } catch (err) {
                console.warn("LC sync check failed:", err.message);
            }
        }

        // ─── Update heatmap with newly solved problems ───
        if (newlySolved > 0) {
            await addToHeatmap(userId, handle, newlySolved);
        }

        // ─── Save user and recalculate streak ───
        const streak = await calculateAppStreak(userId);
        user.streak = streak;
        const updatedUser = await user.save();

        res.status(200).json({
            message: `Profile synced. ${newlySolved} new problem(s) solved!`,
            newlySolved,
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