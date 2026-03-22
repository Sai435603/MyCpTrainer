import { Router } from "express";
import passport from "passport";
import oauthCallback from "../controllers/oauthController.js";
import { FRONTEND_URL } from "../constants.js";

const router = Router();

// ── Google ──
router.get(
  "/api/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"], session: false })
);
router.get(
  "/api/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/api/auth/failure", session: false }),
  oauthCallback
);

// ── GitHub ──
router.get(
  "/api/auth/github",
  passport.authenticate("github", { scope: ["user:email"], session: false })
);
router.get(
  "/api/auth/github/callback",
  passport.authenticate("github", { failureRedirect: "/api/auth/failure", session: false }),
  oauthCallback
);

// ── Twitter / X ──
router.get(
  "/api/auth/twitter",
  passport.authenticate("twitter")
);
router.get(
  "/api/auth/twitter/callback",
  passport.authenticate("twitter", { failureRedirect: "/api/auth/failure" }),
  oauthCallback
);

// ── Failure endpoint ──
router.get("/api/auth/failure", (req, res) => {
  res.redirect(`${FRONTEND_URL}/auth/callback?error=auth_failed`);
});

export default router;
