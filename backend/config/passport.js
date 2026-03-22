import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";
import { Strategy as TwitterStrategy } from "passport-twitter";
import User from "../models/User.js";

/**
 * Generate a unique handle from an OAuth profile display name.
 * Appends a random 4-digit suffix and checks for collisions.
 */
async function generateUniqueHandle(baseName) {
  // Sanitise: keep alphanumeric + underscores, max 20 chars
  const clean = (baseName || "user")
    .replace(/[^a-zA-Z0-9_]/g, "")
    .slice(0, 20) || "user";

  for (let attempt = 0; attempt < 10; attempt++) {
    const suffix = Math.floor(1000 + Math.random() * 9000); // 4-digit
    const candidate = `${clean}_${suffix}`;
    const exists = await User.findOne({ handle: candidate }).select("_id").lean();
    if (!exists) return candidate;
  }
  // Fallback: timestamp-based
  return `${clean}_${Date.now()}`;
}

/**
 * Common verify callback shared by all OAuth strategies.
 * Finds an existing user by { authProvider, oauthId } or creates a new one.
 */
function makeVerifyCallback(providerName) {
  return async (accessToken, refreshToken, profile, done) => {
    try {
      const oauthId = profile.id;
      const email =
        profile.emails && profile.emails.length > 0
          ? profile.emails[0].value
          : null;
      const avatar =
        profile.photos && profile.photos.length > 0
          ? profile.photos[0].value
          : null;
      const displayName = profile.displayName || profile.username || "user";

      // 1. Look up existing OAuth user
      let user = await User.findOne({ authProvider: providerName, oauthId });

      if (!user) {
        // 2. Check if a local user with the same email already exists — link them
        if (email) {
          user = await User.findOne({ email, authProvider: "local" });
          if (user) {
            user.authProvider = providerName;
            user.oauthId = oauthId;
            user.avatar = user.avatar || avatar;
            await user.save();
            return done(null, user);
          }
        }

        // 3. Create brand-new user
        const handle = await generateUniqueHandle(displayName);
        user = await User.create({
          handle,
          authProvider: providerName,
          oauthId,
          email,
          avatar,
          rating: 800,
          cfLinked: false,
          lcLinked: false,
        });
      }

      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
  };
}

export default function configurePassport() {
  // ── Google ──
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: "/api/auth/google/callback",
        },
        makeVerifyCallback("google")
      )
    );
  }

  // ── GitHub ──
  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    passport.use(
      new GitHubStrategy(
        {
          clientID: process.env.GITHUB_CLIENT_ID,
          clientSecret: process.env.GITHUB_CLIENT_SECRET,
          callbackURL: "/api/auth/github/callback",
        },
        makeVerifyCallback("github")
      )
    );
  }

  // ── Twitter / X ──
  if (process.env.TWITTER_CONSUMER_KEY && process.env.TWITTER_CONSUMER_SECRET) {
    passport.use(
      new TwitterStrategy(
        {
          consumerKey: process.env.TWITTER_CONSUMER_KEY,
          consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
          callbackURL: "/api/auth/twitter/callback",
        },
        makeVerifyCallback("twitter")
      )
    );
  }

  // We use JWT, not sessions — so serialize/deserialize are no-ops
  passport.serializeUser((user, done) => done(null, user._id));
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id).lean();
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });
}
