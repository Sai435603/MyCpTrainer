import Problem from "../models/Problem.js";

async function fetchLoginChallenge(req, res) {
  const problem = await Problem.aggregate([{ $sample: { size: 1 } }]);
  if (!problem) return res.status(404).send("No problems found");
  const questionUrl = `https://codeforces.com/problemset/problem/${problem[0].contestId}/${problem[0].index}`;
  res.status(200).json({ questionUrl, duration: 300 });
}

export default fetchLoginChallenge;
