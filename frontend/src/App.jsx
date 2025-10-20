import "./App.css";
import { useState, useEffect } from "react";
import MainApp from "./components/MainApp.jsx";
import LoginContext from "./contexts/LoginContext.jsx";
import Login from "./components/Login.jsx";
import { BrowserRouter as Router } from "react-router-dom";
import LoadingSpinner from "./loaders/CptrainerLoader.jsx";
import Nav from "./components/Nav.jsx";
export default function App() {
  const [user, setUser] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const verifySession = async () => {
      try {
        const res = await fetch("http://localhost:3000/api/auth/verify", {
          credentials: "include",
        });

        if (res.ok) {
          const data = await res.json();
          setIsAuthenticated(true);
          setUser(data.user.handle);
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
      value={{ user, setUser, isAuthenticated, setIsAuthenticated }}
    >
      <Router>
        
        {isAuthenticated ? <><Nav /><MainApp /></>: <Login />}
      </Router>
    </LoginContext.Provider>
  );
}
