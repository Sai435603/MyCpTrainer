import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

async function verifyUser(req, res) {
  
  const { handle, password } = req.body || {};

  try {
    const user = await User.findOne({ handle }).lean();
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const payload = { user: { id: user._id, handle: user.handle } };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1d" });

   
    res.cookie('token', token, {
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/', 
      maxAge: 24 * 60 * 60 * 1000 
    });

    
    return res.status(200).json({
      message: "Login successful.",
      handle: user.handle,
    });

  } catch (error) {
    console.error("Error in verifyUser:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
}

export default verifyUser;