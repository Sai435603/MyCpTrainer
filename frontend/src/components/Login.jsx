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
