import fetchUpcomingcontests from "./modules/fetchUpcomingcontests.js";
import dailyProblems from "./controllers/dailyProblems.js";
import fetchRating from "./controllers/fetchRating.js";
import fetchHeatmap from "./controllers/fetchHeatmap.js";
import setUpDatabase from "./utils/setUpDatabase.js";
import initializeProblemSet from "./utils/initializeProblemSet.js";
import fetchLoginChallenge from "./controllers/fetchLoginChallenge.js";
import verifyChallenge from "./controllers/verifyChallenge.js";
import verifyUser from "./controllers/verifyUser.js";
import authMiddleware from "./middleware/authMiddleware.js";
import logOutHandler from "./controllers/logOutHandler.js";
import fetchAnalytics from "./controllers/fetchAnalytics.js";
import verifySession from "./controllers/verifySession.js";
import syncProfile from "./controllers/syncProfile.js";
import fetchStreak from "./controllers/fetchStreak.js";
import getAllBlogs from "./controllers/getAllBlogs.js";
import createBlog from "./controllers/createBlog.js";
import getBlogById from "./controllers/getBlogById.js";
import updateBlog from "./controllers/updateBlog.js";
import deleteBlog from "./controllers/deleteBlog.js";
import { FRONTEND_URL } from "./constants.js";
import cron from "node-cron";
import express, { json } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
dotenv.config();
const app = express();
const port = process.env.PORT || 3000;

app.use(json());
app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(cookieParser());

try {
  await setUpDatabase();
  await initializeProblemSet();

  app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
  });

  cron.schedule(
    "0 0 * * *",
    async () => {
      try {
        await initializeProblemSet();
        console.log("Problem set initialized successfully.");
      } catch (error) {
        console.error("Error initializing problem set:", error);
      }
    },
    {
      timezone: "Asia/Kolkata",
    }
  );
} catch (error) {
  console.error("Error during server setup:", error);
}

app.get("/api/challenge", fetchLoginChallenge);

app.post("/api/signup", verifyChallenge);

app.post("/api/login", verifyUser);

app.post("/api/logout", logOutHandler);

app.get("/api/auth/verify", authMiddleware, verifySession);

app.get("/api/problems/:user", authMiddleware, dailyProblems);

app.get("/api/rating/:user", authMiddleware, fetchRating);

app.get("/api/heatmap/:user", authMiddleware, fetchHeatmap);

app.get("/api/analytics/:user", authMiddleware, fetchAnalytics);

app.get("/api/sync-profile/:user", authMiddleware, syncProfile);

app.get("/api/streak/:user", authMiddleware, fetchStreak);

app.get("/api/blogs", getAllBlogs);

app.post("/api/blogs", createBlog);

app.get("/api/blogs/:id", getBlogById);

app.put("/api/blogs/:id", updateBlog);    

app.delete("/api/blogs/:id", deleteBlog);

app.get("/api/contests", async (req, res) => {
  try {
    const contests = await fetchUpcomingcontests();
    res.json(contests);
  } catch (err) {
    console.error("Error in /api/upcomingContests:", err);
    res.status(500).json({ error: "Failed to fetch upcoming contests" });
  }
});
