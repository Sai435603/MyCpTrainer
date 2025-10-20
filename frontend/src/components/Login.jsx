import { useContext, useState, useEffect, useRef } from "react";
import LoginContext from "../contexts/LoginContext";
import "../styles/Login.css";

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
    } else {
      handleSignUpAndReset();
    }
  };

  const handleSignIn = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    if (password.trim().length < 6) {
      return setError("Password must be at least 6 characters long.");
    }
    try {
      const res = await fetch("http://localhost:3000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle: username.trim(), password }),
        credentials: 'include',
      });

      if (!res.ok) throw new Error(await parseResponseError(res));

      const data = await res.json();
      setSuccess(data.message || "Signed in successfully!");
      setUser(data.handle);
      setIsAuthenticated(true);
    } catch (err) {
      setError(err.message || "Invalid username or password.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUpAndReset = async () => {
    setError(null);
    setSuccess(null);
    if (password !== confirmPassword) {
      return setError(
        isResetMode ? "New passwords do not match." : "Passwords do not match."
      );
    }
    if (password.trim().length < 6) {
      return setError("Password must be at least 6 characters long.");
    }
    if (!timing) {
      if (!username.trim())
        return setError("Please enter a Codeforces handle.");
      setLoading(true);
      try {
        const res = await fetch(
          `http://localhost:3000/api/challenge?handle=${username.trim()}`
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
          isReset: isResetMode,
        };
        const verifyRes = await fetch("http://localhost:3000/api/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(verifyPayload),
          credentials: 'include',
        });
        if (!verifyRes.ok) throw new Error(await parseResponseError(verifyRes));

        const verifyData = await verifyRes.json();
        const action = isResetMode ? "Password Reset" : "Account Creation";
        setSuccess(`${action} successful!`);
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

  // The rest of your JSX remains the same
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

        {formType === "signup" && (
          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label>{isResetMode ? "Username" : "Codeforces Handle"}</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={isBusy || timing}
                placeholder={
                  isResetMode
                    ? "Your account username"
                    : "Your Codeforces handle"
                }
              />
            </div>
            <div className="form-group">
              <label>{isResetMode ? "New Password" : "Password"}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isBusy}
                placeholder="Enter a password"
              />
            </div>
            <div className="form-group">
              <label>
                {isResetMode ? "Confirm New Password" : "Confirm Password"}
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isBusy}
                placeholder="Confirm your password"
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
                : isResetMode
                ? "Start Reset Process"
                : "Sign Up"}
            </button>
          </form>
        )}

        {formType === "signup" && timing && (
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
                <a href={questionUrl} target="_blank" rel="noopener noreferrer">
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
