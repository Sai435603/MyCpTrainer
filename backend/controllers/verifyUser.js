import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

async function verifyUser(req, res) {
  const { handle, password } = req.body || {};

  if (!handle || !password) {
    return res.status(400).json({ message: "Handle and password are required." });
  }

  try {
    // Use select to only fetch needed fields — faster query
    const user = await User.findOne({ handle })
      .select("handle passwordHash rating streak")
      .lean();

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    // Include user data in JWT so client can hydrate instantly
    const payload = {
      user: {
        id: user._id,
        handle: user.handle,
        rating: user.rating || 800,
        streak: user.streak || 0,
      },
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "7d", // longer expiry = fewer re-logins
    });

    return res.status(200).json({
      message: "Login successful.",
      handle: user.handle,
      token,
    });
  } catch (error) {
    console.error("Error in verifyUser:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
}

export default verifyUser;
