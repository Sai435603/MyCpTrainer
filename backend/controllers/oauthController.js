import jwt from "jsonwebtoken";
import { FRONTEND_URL } from "../constants.js";

/**
 * OAuth callback handler — called after Passport successfully authenticates.
 * Signs a JWT with the same shape the rest of the app expects, then redirects
 * the browser to the frontend with the token in the query string.
 */
export default function oauthCallback(req, res) {
  try {
    const user = req.user;

    if (!user) {
      return res.redirect(`${FRONTEND_URL}/auth/callback?error=auth_failed`);
    }

    const payload = {
      user: {
        id: user._id,
        handle: user.handle,
        rating: user.rating || 800,
        streak: user.streak || 0,
      },
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    // Redirect to frontend callback page with the JWT
    return res.redirect(`${FRONTEND_URL}/auth/callback?token=${token}`);
  } catch (err) {
    console.error("oauthCallback error:", err);
    return res.redirect(`${FRONTEND_URL}/auth/callback?error=server_error`);
  }
}
