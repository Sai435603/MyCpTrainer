import "../styles/Nav.css";
import { FaFire, FaUserCircle } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import { useContext } from "react";
import  LoginContext  from "../contexts/LoginContext.jsx";
export default function Nav() {
  const streak = 0;
  const {  setIsAuthenticated } = useContext(LoginContext);
  const handleLogout = async () => {
    try {
      const response = await fetch("http://localhost:3000/api/logout", {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Logout request failed");
      }

      const data = await response.json();
      // console.log(data.message);
       setIsAuthenticated(false);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <nav className="navbar">
      <div className="navbarlogo">CP TRAINER</div>

      <ul className="navbarlinks">
        <li>
          <Link to="/">PROBLEMS</Link>
        </li>
        <li>
          <Link to="/contests">CONTESTS</Link>
        </li>
        <li>
          <Link to="/analytics">ANALYTICS</Link>
        </li>
        <li>
          <Link to="/blogs">BLOGS</Link>
        </li>
      </ul>

      <div className="navbarstreak">
        <FaFire className="streak-icon" />
        <span className="streak-count">{streak} days</span>
      </div>

      <button className="navbarlogin">Sync Profile</button>

      <div
        className="profile-wrapper"
        onClick={handleLogout}
        style={{ cursor: "pointer" }}
      >
        <button className="profile-icon-btn">
          <FaUserCircle size={28} />
        </button>
        <div className="profile-tooltip">Want to logout from the profile</div>
      </div>
    </nav>
  );
}
