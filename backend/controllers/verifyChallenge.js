import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

/**
 * POST /api/signup
 * Simple username + password signup (no CF challenge).
 * Also handles password reset (isReset: true) which still requires CF verification.
 */
async function verifyChallenge(req, res) {
  const { handle, password, isReset, questionUrl, elapsedSeconds } = req.body || {};

  // --- Input Validation ---
  if (!handle || typeof handle !== "string") {
    return res.status(400).json({ message: "Username is required." });
  }

  const trimmedHandle = handle.trim();
  if (trimmedHandle.length < 3 || trimmedHandle.length > 30) {
    return res.status(400).json({ message: "Username must be 3-30 characters." });
  }

  if (!password || typeof password !== "string" || password.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters long." });
  }

  try {
    // --- Password Reset Flow (still uses CF verification) ---
    if (isReset) {
      if (!questionUrl || typeof questionUrl !== "string") {
        return res.status(400).json({ message: "Challenge information is missing." });
      }
      if (elapsedSeconds == null || typeof elapsedSeconds !== "number" || elapsedSeconds < 0) {
        return res.status(400).json({ message: "Invalid request data." });
      }

      const existingUser = await User.findOne({ handle: trimmedHandle });
      if (!existingUser) {
        return res.status(404).json({ message: "User not found. Cannot reset password." });
      }

      // Verify CF submission for password reset
      const cfHandle = existingUser.cfHandle || trimmedHandle;
      const cfResponse = await fetch(
        `https://codeforces.com/api/user.status?handle=${encodeURIComponent(cfHandle)}&from=1&count=300`
      );
      if (!cfResponse.ok) {
        return res.status(502).json({ message: "Could not connect to Codeforces API." });
      }
      const data = await cfResponse.json();
      if (data.status !== "OK") {
        return res.status(400).json({ message: `Codeforces API error: ${data.comment}` });
      }
      const compilerErrorSubmission = data.result.find((sub) => {
        const problemUrl = `https://codeforces.com/problemset/problem/${sub.problem.contestId}/${sub.problem.index}`;
        return problemUrl === questionUrl && sub.verdict === "COMPILATION_ERROR";
      });
      if (!compilerErrorSubmission) {
        return res.status(401).json({
          message: "Verification failed. Could not find the required compilation error submission.",
        });
      }

      const salt = await bcrypt.genSalt(10);
      existingUser.passwordHash = await bcrypt.hash(password, salt);
      await existingUser.save();

      const payload = {
        user: {
          id: existingUser._id,
          handle: existingUser.handle,
          rating: existingUser.rating || 800,
          streak: existingUser.streak || 0,
        },
      };
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "7d" });

      return res.status(200).json({
        message: "Password reset successfully.",
        handle: existingUser.handle,
        token,
      });
    }

    // --- Simple Signup Flow ---
    const existingUser = await User.findOne({ handle: trimmedHandle });
    if (existingUser) {
      return res.status(409).json({ message: "Username already taken. Please choose another." });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = new User({
      handle: trimmedHandle,
      passwordHash,
      rating: 800,
      cfLinked: false,
      lcLinked: false,
    });
    await newUser.save();

    const payload = {
      user: {
        id: newUser._id,
        handle: newUser.handle,
        rating: newUser.rating || 800,
        streak: newUser.streak || 0,
      },
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "7d" });

    return res.status(201).json({
      message: "Account created successfully!",
      handle: newUser.handle,
      token,
    });
  } catch (err) {
    console.error("Signup Error:", err);
    res.status(500).json({ message: "An internal server error occurred." });
  }
}

export default verifyChallenge;