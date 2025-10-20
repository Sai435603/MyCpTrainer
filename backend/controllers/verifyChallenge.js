import fetch from "node-fetch";
import bcrypt from "bcryptjs";
import User from "../models/User.js";

async function verifyChallenge(req, res) {
  const { handle, questionUrl, elapsedSeconds, password, isReset } = req.body || {};

  if (!handle || typeof handle !== "string") {
    return res.status(400).json({ message: "Handle is required." });
  }
  if (!questionUrl || typeof questionUrl !== "string") {
    return res.status(400).json({ message: "Challenge information is missing." });
  }
  if (!password || typeof password !== "string" || password.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters long." });
  }
  if (elapsedSeconds == null || typeof elapsedSeconds !== "number" || elapsedSeconds < 0) {
    return res.status(400).json({ message: "Invalid request data." });
  }

  try {
    // --- Step 1: Verifying Codeforces Submission ---
    const cfResponse = await fetch(`https://codeforces.com/api/user.status?handle=${handle}&from=1&count=300`);
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
      return res.status(401).json({ message: "Verification failed. Could not find the required compilation error submission on Codeforces." });
    }

    // --- Step 2: Hash Password ---
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // --- Step 3: Handle User in Database (Create or Update) ---
    const user = await User.findOne({ handle });

    if (isReset) {
      // --- Password Reset Logic ---
      if (!user) {
        return res.status(404).json({ message: "User not found. Cannot reset password." });
      }
      user.passwordHash = passwordHash;
      await user.save();
      return res.status(200).json({ message: "Password reset successfully.", handle });

    } else {
      // --- Sign Up Logic ---
      if (user) {
        return res.status(409).json({ message: "User with this handle already exists." });
      }
      const cfUserResponse = await fetch(`https://codeforces.com/api/user.info?handles=${handle}`);
      const cfUserData = await cfUserResponse.json();
      if (cfUserData.status !== "OK" || !cfUserData.result || cfUserData.result.length === 0) {
        return res.status(400).json({ message: "Failed to fetch user info from Codeforces" });
      }
      const cfUser = cfUserData.result[0];

      const newUser = new User({
        handle,
        passwordHash,
        rating: cfUser.rating || 800,
        // streak and dailyProblems will use schema defaults
      });
      await newUser.save();
      return res.status(201).json({ message: "User created successfully!", handle });
    }
    
  } catch (err) {
    console.error("Verification Error:", err);
    res.status(500).json({ message: "An internal server error occurred." });
  }
}

export default verifyChallenge;