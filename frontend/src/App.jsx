import "./App.css";
import { useState, useEffect } from "react";
import MainApp from "./components/MainApp.jsx";
import LoginContext from "./contexts/LoginContext.jsx";
import Login from "./components/Login.jsx";
import { BrowserRouter as Router } from "react-router-dom";
import LoadingSpinner from "./loaders/CptrainerLoader.jsx";
import { BASE_URL } from "./constants.js";
export default function App() {
  const [user, setUser] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    const verifySession = async () => {
      try {
        const res = await fetch(`${BASE_URL}/api/auth/verify`, {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setIsAuthenticated(true);
          setUser(data.user.handle);
          setStreak(data.user.streak || 0);
        }
      } catch (err) {
        console.error("No valid session found on initial load");
      } finally {
        setInitializing(false);
      }
    };
    verifySession();
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
