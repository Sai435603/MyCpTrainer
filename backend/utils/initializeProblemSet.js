import Problem from "../models/Problem.js";

async function initializeProblemSet() {
  try {
    const response = await fetch(
      "https://codeforces.com/api/problemset.problems"
    );
    const data = await response.json();
    if (data.status !== "OK") throw new Error("Failed to fetch CF problems");

    const problems = data.result.problems;

    const bulkOps = problems.map((p) => ({
      updateOne: {
        filter: { contestId: p.contestId, index: p.index },
        update: {
          $set: {
            name: p.name,
            problemType: p.type || "",
            rating: p.rating || null,
            tags: p.tags || [],
          },
        },
        upsert: true,
      },
    }));

    const result = await Problem.bulkWrite(bulkOps);
    console.log(`Inserted: ${result.nUpserted}, Updated: ${result.nModified}`);
  } catch (e) {
    throw new Error(`initializeProblemSet failed: ${e.message}`);
  }
}
export default initializeProblemSet;
