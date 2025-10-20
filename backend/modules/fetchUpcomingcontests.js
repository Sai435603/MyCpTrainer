import pkg from '@qatadaazzeh/atcoder-api';
const { fetchUpcomingContests } = pkg;
/**
 * Codeforces
 */
async function getCodeforcesContests() {
  try {
    const res = await fetch("https://codeforces.com/api/contest.list");
    const { status, result } = await res.json();
    if (status !== "OK" || !Array.isArray(result)) return [];

    return result
      .filter((c) => c.phase === "BEFORE") // only upcoming
      .map((c) => ({
        platform: "Codeforces",
        name: c.name,
        start: new Date(c.startTimeSeconds * 1000).toISOString(),
        phase: c.phase,
        url: `https://codeforces.com/contest/${c.id}`,
      }));
  } catch (err) {
    console.error("CF fetch error:", err.message);
    return [];
  }
}

/**
 * CodeChef
 */
async function getCodeChefContests() {
  try {
    const res = await fetch("https://www.codechef.com/api/list/contests/all");
    const data = await res.json();
    const all = data.future_contests || [];
    return all.map((c) => ({
      platform: "CodeChef",
      name: c.contest_name,
      start: new Date(c.contest_start_date_iso).toISOString(),
      phase: c.status,
      url: `https://www.codechef.com/${c.contest_code}`,
    }));
  } catch (err) {
    console.error("CC fetch error:", err.message);
    return [];
  }
}

/**
 * AtCoder via @qatadaazzeh/atcoder-api
 */
async function getAtCoderContests() {
  try {
    const list = await fetchUpcomingContests();

    return list
      .filter((c) => typeof c.contestTime === "string")
      .map((c) => ({
        platform: "AtCoder",
        name: c.contestName,
        start: new Date(c.contestTime).toISOString(),
        phase: "BEFORE",
        url: c.contestUrl,
      }));
  } catch (err) {
    console.error("AC fetch error:", err.message);
    return [];
  }
}

/**
 * Leetcode
 */
async function getLeetCodeContests() {
  try {
    const res = await fetch("https://leetcode.com/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `
          query {
            allContests {
              title
              titleSlug
              startTime
              duration
              isVirtual
            }
          }
        `,
      }),
    });

    const { data } = await res.json();
    const now = Math.floor(Date.now() / 1000);

    if (!data?.allContests) return [];

    return data.allContests
      .filter((c) => c.startTime > now)
      .map((c) => ({
        platform: "LeetCode",
        name: c.title,
        start: new Date(c.startTime * 1000).toISOString(),
        phase: "BEFORE",
        url: `https://leetcode.com/contest/${c.titleSlug}`,
      }));
  } catch (err) {
    console.error("LC fetch error:", err.message);
    return [];
  }
}

/**
 * Combine all three
 */
async function fetchUpcomingcontests() {
  const [cf, cc, ac, lc] = await Promise.all([
    getCodeforcesContests(),
    getCodeChefContests(),
    getAtCoderContests(),
    getLeetCodeContests(),
  ]);

  const allContests = [...cf, ...cc, ...ac, ...lc];

  // Sort by start date
  allContests.sort((a, b) => new Date(a.start) - new Date(b.start));

  return allContests;
}

export default fetchUpcomingcontests;
