import "./App.css";
import { useState, useEffect } from "react";
import MainApp from "./components/MainApp.jsx";
import LoginContext from "./contexts/LoginContext.jsx";
import Login from "./components/Login.jsx";
import { BrowserRouter as Router } from "react-router-dom";
import LoadingSpinner from "./loaders/CptrainerLoader.jsx";
import { BASE_URL } from "./constants.js";

/**
 * Decode a JWT payload without verification (client-side only).
 * This gives us instant user data from the token.
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
 * Check if a JWT is expired based on its `exp` claim.
 */
function isTokenExpired(decoded) {
  if (!decoded?.exp) return true;
  return Date.now() >= decoded.exp * 1000;
}

export default function App() {
  const [user, setUser] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      setInitializing(false);
      return;
    }

    // ── Step 1: Instant hydration from JWT (no network needed) ──
    const decoded = decodeJwtPayload(token);
    if (!decoded?.user?.handle || isTokenExpired(decoded)) {
      localStorage.removeItem("token");
      setInitializing(false);
      return;
    }

    // Immediately authenticate — user sees the app instantly
    setIsAuthenticated(true);
    setUser(decoded.user.handle);
    setStreak(decoded.user.streak || 0);
    setInitializing(false);

    // ── Step 2: Background server verification (non-blocking) ──
    // This refreshes streak/rating silently without blocking the UI
    (async () => {
      try {
        const res = await fetch(`${BASE_URL}/api/auth/verify`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          // Update with fresh server data
          setStreak(data.user.streak || 0);
        } else {
          // Token rejected by server — force logout
          localStorage.removeItem("token");
          setIsAuthenticated(false);
          setUser("");
          setStreak(0);
        }
      } catch (err) {
        // Network error — keep the user logged in from JWT
        console.warn("Background session verify failed:", err.message);
      }
    })();
  }, []);

  if (initializing) {
    return <LoadingSpinner />;
  }

  return (
    <LoginContext.Provider
      value={{
        user,
        setUser,
        isAuthenticated,
        setIsAuthenticated,
        streak,
        setStreak,
      }}
    >
      <Router>{isAuthenticated ? <MainApp /> : <Login />}</Router>
    </LoginContext.Provider>
  );
}
