import { useContext, useState, useEffect, useRef } from "react";
import LoginContext from "../contexts/LoginContext";
import "../styles/Login.css";
import { BASE_URL } from "../constants.js";

const DEFAULT_SECONDS = 300;

async function parseResponseError(res) {
  try {
    const j = await res.json();
    return j && (j.message || j.error || JSON.stringify(j));
  } catch {
    return `${res.status} ${res.statusText}`;
  }
}

export default function Login() {
  const { setUser, setIsAuthenticated } = useContext(LoginContext);

  const [formType, setFormType] = useState("signin");
  const [isResetMode, setIsResetMode] = useState(false);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [timing, setTiming] = useState(false);
  const [questionUrl, setQuestionUrl] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(DEFAULT_SECONDS);

  const intervalRef = useRef(null);

  const isBusy = loading || verifying;
  const progressPercent = Math.round(
    ((DEFAULT_SECONDS - secondsLeft) / DEFAULT_SECONDS) * 100
  );

  const resetAllState = () => {
    setError(null);
    setSuccess(null);
    setUsername("");
    setPassword("");
    setConfirmPassword("");
    setLoading(false);
    setVerifying(false);
    setTiming(false);
    setQuestionUrl("");
    setSecondsLeft(DEFAULT_SECONDS);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const switchFormType = (type) => {
    if (isResetMode) setIsResetMode(false);
    setFormType(type);
    resetAllState();
  };

  const handleForgotPasswordClick = () => {
    resetAllState();
    setFormType("signup");
    setIsResetMode(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formType === "signin") {
      handleSignIn();
    } else if (isResetMode) {
      handlePasswordReset();
    } else {
      handleSignUp();
    }
  };

  // ── Sign In ──
  const handleSignIn = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (password.trim().length < 6) {
      setLoading(false);
      return setError("Password must be at least 6 characters long.");
    }

    try {
      const res = await fetch(`${BASE_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle: username.trim(), password }),
      });

      if (!res.ok) throw new Error(await parseResponseError(res));

      const data = await res.json();
      localStorage.setItem("token", data.token);

      setSuccess(data.message || "Signed in successfully!");
      setUser(data.handle);
      setIsAuthenticated(true);
    } catch (err) {
      setError(err.message || "Invalid username or password.");
    } finally {
      setLoading(false);
    }
  };

  // ── Simple Sign Up (no CF challenge) ──
  const handleSignUp = async () => {
    setError(null);
    setSuccess(null);

    if (password !== confirmPassword) {
      return setError("Passwords do not match.");
    }
    if (password.trim().length < 6) {
      return setError("Password must be at least 6 characters long.");
    }
    if (!username.trim()) {
      return setError("Please enter a username.");
    }

    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle: username.trim(), password }),
      });

      if (!res.ok) throw new Error(await parseResponseError(res));

      const data = await res.json();
      localStorage.setItem("token", data.token);

      setSuccess(data.message || "Account created!");
      setUser(data.handle);
      setIsAuthenticated(true);
    } catch (err) {
      setError(err.message || "Failed to create account.");
    } finally {
      setLoading(false);
    }
  };

  // ── Password Reset (still uses CF challenge) ──
  const handlePasswordReset = async () => {
    setError(null);
    setSuccess(null);

    if (password !== confirmPassword) {
      return setError("New passwords do not match.");
    }
    if (password.trim().length < 6) {
      return setError("Password must be at least 6 characters long.");
    }

    if (!timing) {
      if (!username.trim()) return setError("Please enter your username.");
      setLoading(true);
      try {
        const res = await fetch(
          `${BASE_URL}/api/challenge?handle=${username.trim()}`
        );
        if (!res.ok) throw new Error(await parseResponseError(res));
        const data = await res.json();
        if (!data.questionUrl)
          throw new Error("Server did not return a question URL.");
        setQuestionUrl(data.questionUrl);
        setTiming(true);
      } catch (err) {
        setError(err.message || "Failed to get challenge");
      } finally {
        setLoading(false);
      }
    } else {
      setVerifying(true);
      try {
        const elapsedSeconds = DEFAULT_SECONDS - secondsLeft;
        const verifyPayload = {
          handle: username.trim(),
          password,
          questionUrl,
          elapsedSeconds,
          isReset: true,
        };
        const verifyRes = await fetch(`${BASE_URL}/api/signup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(verifyPayload),
        });
        if (!verifyRes.ok) throw new Error(await parseResponseError(verifyRes));

        const verifyData = await verifyRes.json();
        localStorage.setItem("token", verifyData.token);

        setSuccess("Password Reset successful!");
        setUser(username.trim());
        setIsAuthenticated(true);
      } catch (err) {
        setError(err.message);
      } finally {
        setVerifying(false);
      }
    }
  };

  useEffect(() => {
    if (timing && secondsLeft > 0) {
      intervalRef.current = setInterval(
        () => setSecondsLeft((s) => s - 1),
        1000
      );
    } else if (secondsLeft <= 0) {
      clearInterval(intervalRef.current);
      setError("Time is up. Please try again.");
      setTiming(false);
      setQuestionUrl("");
      setSecondsLeft(DEFAULT_SECONDS);
    }
    return () => clearInterval(intervalRef.current);
  }, [timing, secondsLeft]);

  return (
    <div className="login-container">
      <h1 className="login-logo">CP TRAINER</h1>
      <div className="login-card">
        <div className="login-tabs">
          <span
            className={`login-tab ${formType === "signin" ? "active" : ""}`}
            onClick={() => switchFormType("signin")}
          >
            Sign In
          </span>
          <span
            className={`login-tab ${formType === "signup" ? "active" : ""}`}
            onClick={() => switchFormType("signup")}
          >
            Sign Up
          </span>
        </div>

        {isResetMode && <p className="reset-indicator">Reset Password Mode</p>}

        {formType === "signin" && (
          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={loading}
                placeholder="Your username"
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                placeholder="Your password"
              />
            </div>
            <div className="extra-link">
              <span className="link-text" onClick={handleForgotPasswordClick}>
                Forgot Password?
              </span>
            </div>
            <button type="submit" className="login-button" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </button>

            <div className="oauth-divider">
              <span>Or continue with</span>
            </div>
            <div className="oauth-buttons">
              <a href={`${BASE_URL}/api/auth/google`} className="oauth-btn google">
                <svg viewBox="0 0 24 24" width="18" height="18"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.99 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.1a6.98 6.98 0 0 1 0-4.18V7.07H2.18a11.01 11.01 0 0 0 0 9.86l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Google
              </a>
              <a href={`${BASE_URL}/api/auth/github`} className="oauth-btn github">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
                GitHub
              </a>
              <a href={`${BASE_URL}/api/auth/twitter`} className="oauth-btn twitter">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                X
              </a>
            </div>
          </form>
        )}

        {formType === "signup" && !isResetMode && (
          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={loading}
                placeholder="Choose a username"
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                placeholder="Create a password"
              />
            </div>
            <div className="form-group">
              <label>Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
                placeholder="Confirm your password"
              />
            </div>
            <button type="submit" className="login-button" disabled={loading}>
              {loading ? "Creating Account..." : "Sign Up"}
            </button>
            <p style={{ color: "var(--text-muted)", fontSize: "0.75rem", textAlign: "center", marginTop: "0.75rem" }}>
              Link your Codeforces / LeetCode profiles after signing up
            </p>

            <div className="oauth-divider">
              <span>Or continue with</span>
            </div>
            <div className="oauth-buttons">
              <a href={`${BASE_URL}/api/auth/google`} className="oauth-btn google">
                <svg viewBox="0 0 24 24" width="18" height="18"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.99 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.1a6.98 6.98 0 0 1 0-4.18V7.07H2.18a11.01 11.01 0 0 0 0 9.86l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Google
              </a>
              <a href={`${BASE_URL}/api/auth/github`} className="oauth-btn github">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
                GitHub
              </a>
              <a href={`${BASE_URL}/api/auth/twitter`} className="oauth-btn twitter">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                X
              </a>
            </div>
          </form>
        )}

        {formType === "signup" && isResetMode && (
          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={isBusy || timing}
                placeholder="Your account username"
              />
            </div>
            <div className="form-group">
              <label>New Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isBusy}
                placeholder="Enter a new password"
              />
            </div>
            <div className="form-group">
              <label>Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isBusy}
                placeholder="Confirm your new password"
              />
            </div>
            <button
              type="submit"
              className="login-button"
              disabled={isBusy || (timing && secondsLeft <= 0)}
            >
              {loading
                ? "Getting Challenge..."
                : verifying
                ? "Verifying..."
                : timing
                ? "Verify & Submit"
                : "Start Reset Process"}
            </button>
            <p style={{ color: "var(--text-muted)", fontSize: "0.75rem", textAlign: "center", marginTop: "0.75rem" }}>
              Requires a linked Codeforces profile for identity verification
            </p>
          </form>
        )}

        {isResetMode && timing && (
          <div>
            <div className="progress-wrap">
              <div className="progress-info">
                <span>
                  Time Left: {Math.floor(secondsLeft / 60)}m {secondsLeft % 60}s
                </span>
                <span>{progressPercent}%</span>
              </div>
              <div className="progress-container">
                <div
                  className="progress-bar"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
            <strong className="challenge-text">
              Get a compiler error on:{" "}
              <u>
                <a
                  href={questionUrl}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {questionUrl}
                </a>
              </u>
            </strong>
          </div>
        )}

        <div className="message-area">
          {error && <strong className="error-text">{error}</strong>}
          {success && <strong className="success-text">{success}</strong>}
        </div>
      </div>
    </div>
  );
}
