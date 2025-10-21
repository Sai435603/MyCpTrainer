import "../styles/Nav.css";
import { FaFire, FaUserCircle } from "react-icons/fa";
import { NavLink, useNavigate } from "react-router-dom"; // 1. IMPORT useNavigate
import { useContext } from "react";
import LoginContext from "../contexts/LoginContext.jsx";
import MainAppContext from "../contexts/MainAppContext.jsx";

export default function Nav() {
  const { setIsAuthenticated, streak, setUser } = useContext(LoginContext); // I added setUser here
  const { handleSync, isSyncing } = useContext(MainAppContext);
  const navigate = useNavigate(); // 2. INITIALIZE the hook

  const handleLogout = (e) => {
    e.stopPropagation();
    localStorage.removeItem("token");
    setIsAuthenticated(false);
    setUser(""); // It's also good practice to clear the user
    navigate("/"); // 3. ADD the navigation call
  };

  return (
    <nav className="navbar" role="navigation" aria-label="Main navigation">
      <div className="navbarlogo">CP TRAINER</div>

      <ul className="navbarlinks">
        <li>
          <NavLink to="/" end>
            PROBLEMS
          </NavLink>
        </li>
        <li>
          <NavLink to="/contests">CONTESTS</NavLink>
        </li>
        <li>
          <NavLink to="/analytics">ANALYTICS</NavLink>
        </li>
        <li>
          <NavLink to="/blogs">BLOGS</NavLink>
        </li>
      </ul>

      <div className="navbarstreak" title={`${streak} day streak`}>
        <FaFire className="streak-icon" />
        <span className="streak-count">{streak} days</span>
      </div>

      <button
        type="button"
        className="navbarlogin"
        onClick={(e) => {
          e.stopPropagation();
          handleSync();
        }}
        disabled={isSyncing}
      >
        {isSyncing ? "Syncing..." : "Sync Profile"}
      </button>

      <div className="profile-wrapper" style={{ marginLeft: "8px" }}>
        <button
          type="button"
          className="profile-icon-btn"
          onClick={handleLogout}
          aria-label="Logout"
          title="Logout"
        >
          <FaUserCircle size={20} />
        </button>
        <div className="profile-tooltip">Want to logout from the profile</div>
      </div>
    </nav>
  );
}