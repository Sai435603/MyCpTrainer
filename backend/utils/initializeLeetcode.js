import LeetcodeProblem from "../models/LeetcodeProblem.js";

const LC_GRAPHQL_URL = "https://leetcode.com/graphql";

const PROBLEMSET_QUERY = `
  query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int) {
    problemsetQuestionList: questionList(
      categorySlug: $categorySlug
      limit: $limit
      skip: $skip
      filters: {}
    ) {
      total: totalNum
      questions: data {
        frontendQuestionId: questionFrontendId
        titleSlug
        title
        difficulty
        topicTags { slug }
        paidOnly: isPaidOnly
      }
    }
  }
`;

async function fetchLeetcodeProblems(limit = 3000, skip = 0) {
  try {
    const res = await fetch(LC_GRAPHQL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: PROBLEMSET_QUERY,
        variables: { categorySlug: "", limit, skip },
      }),
    });

    if (!res.ok) {
      console.error("LeetCode API returned status:", res.status);
      return [];
    }

    const json = await res.json();
    const questions = json?.data?.problemsetQuestionList?.questions;
    if (!Array.isArray(questions)) {
      console.error("Unexpected LeetCode response structure");
      return [];
    }
    return questions;
  } catch (err) {
    console.error("Failed to fetch LeetCode problems:", err.message);
    return [];
  }
}

async function initializeLeetcode() {
  try {
    const questions = await fetchLeetcodeProblems();
    if (questions.length === 0) {
      console.log("No LeetCode problems fetched, skipping initialization.");
      return;
    }

    const bulkOps = questions
      .filter((q) => q.frontendQuestionId && q.titleSlug && q.difficulty)
      .map((q) => ({
        updateOne: {
          filter: { frontendId: Number(q.frontendQuestionId) },
          update: {
            $set: {
              titleSlug: q.titleSlug,
              title: q.title,
              difficulty: q.difficulty,
              topicTags: Array.isArray(q.topicTags) ? q.topicTags.map((t) => t.slug) : [],
              paidOnly: !!q.paidOnly,
            },
          },
          upsert: true,
        },
      }));

    const result = await LeetcodeProblem.bulkWrite(bulkOps);
    console.log(
      `LeetCode: Upserted ${result.upsertedCount || 0}, Modified ${result.modifiedCount || 0} problems`
    );
  } catch (e) {
    console.error(`initializeLeetcode failed: ${e.message}`);
    // Don't throw — LeetCode init failure shouldn't block server startup
  }
}

export default initializeLeetcode;
