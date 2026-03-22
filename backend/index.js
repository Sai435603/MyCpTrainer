import fetchUpcomingcontests from "./modules/fetchUpcomingcontests.js";
import dailyProblems from "./controllers/dailyProblems.js";
import fetchRating from "./controllers/fetchRating.js";
import { fetchLCRating } from "./controllers/fetchRating.js";
import fetchHeatmap from "./controllers/fetchHeatmap.js";
import { resetHeatmap } from "./controllers/fetchHeatmap.js";
import setUpDatabase from "./utils/setUpDatabase.js";
import initializeProblemSet from "./utils/initializeProblemSet.js";
import initializeLeetcode from "./utils/initializeLeetcode.js";
import fetchLoginChallenge from "./controllers/fetchLoginChallenge.js";
import verifyChallenge from "./controllers/verifyChallenge.js";
import verifyUser from "./controllers/verifyUser.js";
import authMiddleware from "./middleware/authMiddleware.js";
import fetchAnalytics from "./controllers/fetchAnalytics.js";
import verifySession from "./controllers/verifySession.js";
import syncProfile from "./controllers/syncProfile.js";
import fetchStreak from "./controllers/fetchstreak.js";
import getAllBlogs from "./controllers/getAllBlogs.js";
import createBlog from "./controllers/createBlog.js";
import getBlogById from "./controllers/getBlogById.js";
import updateBlog from "./controllers/updateBlog.js";
import deleteBlog from "./controllers/deleteBlog.js";
import { getProfile, linkProfile, unlinkProfile } from "./controllers/linkProfile.js";
import { searchUsers, followUser, unfollowUser, getFriends } from "./controllers/followController.js";
import solveProblem from "./controllers/solveProblem.js";
import { FRONTEND_URL } from "./constants.js";
import cron from "node-cron";
import express, { json } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import session from "express-session";
import passport from "passport";
import configurePassport from "./config/passport.js";
import authRoutes from "./routes/authRoutes.js";
import dotenv from "dotenv";
dotenv.config();

// Configure Passport strategies
configurePassport();

const app = express();
const port = process.env.PORT || 3000;

app.use(json());
app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(cookieParser());

// Session middleware (needed for Twitter OAuth handshake)
app.use(
  session({
    secret: process.env.JWT_SECRET || "cptrainer-session-secret",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 5 * 60 * 1000 }, // 5 min — only used during OAuth flow
  })
);

app.use(passport.initialize());
app.use(passport.session());

// OAuth routes
app.use(authRoutes);

try {
  await setUpDatabase();

  // Initialize problem sets in parallel for faster startup
  await Promise.allSettled([
    initializeProblemSet(),
    initializeLeetcode(),
  ]);

  app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
  });

  cron.schedule(
    "0 0 * * *",
    async () => {
      try {
        await Promise.allSettled([
          initializeProblemSet(),
          initializeLeetcode(),
        ]);
        console.log("Problem sets initialized successfully.");
      } catch (error) {
        console.error("Error initializing problem sets:", error);
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

app.get("/api/auth/verify", authMiddleware, verifySession);

app.get("/api/problems/:user", authMiddleware, dailyProblems);
app.post("/api/problems/solve", authMiddleware, solveProblem);

app.get("/api/rating/:user", authMiddleware, fetchRating);
app.get("/api/lc-rating/:user", authMiddleware, fetchLCRating);

app.get("/api/heatmap/:user", authMiddleware, fetchHeatmap);
app.post("/api/heatmap/reset", authMiddleware, resetHeatmap);

app.get("/api/analytics/:user", authMiddleware, fetchAnalytics);

app.get("/api/sync-profile/:user", authMiddleware, syncProfile);

app.get("/api/streak/:user", authMiddleware, fetchStreak);

app.get("/api/profile", authMiddleware, getProfile);
app.put("/api/profile/link", authMiddleware, linkProfile);
app.delete("/api/profile/link", authMiddleware, unlinkProfile);

app.get("/api/blogs", getAllBlogs);

app.post("/api/blogs", createBlog);

app.get("/api/blogs/:id", getBlogById);

app.put("/api/blogs/:id", updateBlog);    

app.delete("/api/blogs/:id", deleteBlog);

app.get("/api/friends/search", authMiddleware, searchUsers);
app.post("/api/friends/follow", authMiddleware, followUser);
app.post("/api/friends/unfollow", authMiddleware, unfollowUser);
app.get("/api/friends", authMiddleware, getFriends);

app.get("/api/contests", async (req, res) => {
  try {
    const contests = await fetchUpcomingcontests();
    res.json(contests);
  } catch (err) {
    console.error("Error in /api/upcomingContests:", err);
    res.status(500).json({ error: "Failed to fetch upcoming contests" });
  }
});
