import { useContext, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import LoginContext from "../contexts/LoginContext";
import "../styles/Login.css";

/**
 * Decode a JWT payload without verification (client-side only).
 */
function decodeJwtPayload(token) {
  try {
    const base64 = token.split(".")[1];
    const json = atob(base64.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * OAuthCallback — handles the redirect from the backend after OAuth login.
 * Reads `?token=xxx` from the URL, saves it, and redirects to /.
 */
export default function OAuthCallback() {
  const { setUser, setIsAuthenticated, setStreak } = useContext(LoginContext);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = searchParams.get("token");
    const err = searchParams.get("error");

    if (err) {
      setError("Authentication failed. Please try again.");
      setTimeout(() => navigate("/"), 3000);
      return;
    }

    if (token) {
      localStorage.setItem("token", token);

      const decoded = decodeJwtPayload(token);
      if (decoded?.user) {
        setUser(decoded.user.handle);
        setStreak(decoded.user.streak || 0);
        setIsAuthenticated(true);
      }

      navigate("/");
    } else {
      setError("No token received. Please try again.");
      setTimeout(() => navigate("/"), 3000);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <div className="login-container">
        <h1 className="login-logo">CP TRAINER</h1>
        <div className="login-card" style={{ textAlign: "center" }}>
          <p className="error-text">{error}</p>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "1rem" }}>
            Redirecting to login...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <h1 className="login-logo">CP TRAINER</h1>
      <div className="login-card" style={{ textAlign: "center" }}>
        <p style={{ color: "var(--text-secondary)" }}>Signing you in...</p>
      </div>
    </div>
  );
}
