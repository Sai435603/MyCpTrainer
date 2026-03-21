import "../styles/Nav.css";
import { FaFire, FaUserCircle, FaChevronDown, FaLink, FaSignOutAlt } from "react-icons/fa";
import { NavLink, useNavigate } from "react-router-dom";
import { useContext, useState, useRef, useEffect } from "react";
import LoginContext from "../contexts/LoginContext.jsx";
import MainAppContext from "../contexts/MainAppContext.jsx";
import ProfileModal from "./ProfileModal.jsx";

export default function Nav() {
  const { setIsAuthenticated, streak, setUser, user } = useContext(LoginContext);
  const { handleSync, isSyncing, profileData, setProfileData } = useContext(MainAppContext);
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsAuthenticated(false);
    setUser("");
    navigate("/");
  };

  return (
    <>
      <nav className="navbar" role="navigation" aria-label="Main navigation">
        <div className="navbarlogo">CP TRAINER</div>

        <ul className="navbarlinks">
          <li><NavLink to="/" end>PROBLEMS</NavLink></li>
          <li><NavLink to="/contests">CONTESTS</NavLink></li>
          <li><NavLink to="/analytics">ANALYTICS</NavLink></li>
          <li><NavLink to="/blogs">BLOGS</NavLink></li>
        </ul>

        <div className="navbarstreak" title={`${streak} day streak`}>
          <FaFire className="streak-icon" />
          <span className="streak-count">{streak} days</span>
        </div>

        <button
          type="button"
          className="navbarlogin"
          onClick={() => handleSync()}
          disabled={isSyncing}
        >
          {isSyncing ? "Syncing…" : "Sync Profile"}
        </button>

        {/* Profile Dropdown */}
        <div className="profile-dropdown-wrapper" ref={dropdownRef}>
          <button
            type="button"
            className="profile-icon-btn"
            onClick={() => setShowDropdown(!showDropdown)}
            aria-label="Profile menu"
          >
            <FaUserCircle size={18} />
            <FaChevronDown size={10} style={{ marginLeft: 4, opacity: 0.6 }} />
          </button>

          {showDropdown && (
            <div className="profile-dropdown">
              <div className="dropdown-user">
                <span className="dropdown-handle">{user}</span>
                <div className="dropdown-badges">
                  {profileData?.cfLinked && <span className="mini-badge cf">CF</span>}
                  {profileData?.lcLinked && <span className="mini-badge lc">LC</span>}
                </div>
              </div>
              <div className="dropdown-divider" />
              <button
                className="dropdown-item"
                onClick={() => { setShowDropdown(false); setShowProfileModal(true); }}
              >
                <FaLink size={13} /> Manage Profiles
              </button>
              <button
                className="dropdown-item danger"
                onClick={() => { setShowDropdown(false); setShowLogoutConfirm(true); }}
              >
                <FaSignOutAlt size={13} /> Logout
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Logout Confirmation */}
      {showLogoutConfirm && (
        <div className="confirm-overlay" onClick={() => setShowLogoutConfirm(false)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Logout</h3>
            <p>Are you sure you want to logout?</p>
            <div className="confirm-actions">
              <button className="confirm-cancel" onClick={() => setShowLogoutConfirm(false)}>
                Cancel
              </button>
              <button className="confirm-yes" onClick={handleLogout}>
                Yes, Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {showProfileModal && (
        <ProfileModal
          profile={profileData}
          onClose={() => setShowProfileModal(false)}
          onUpdate={(data) => {
            setProfileData(prev => ({ ...prev, ...data }));
          }}
        />
      )}
    </>
  );
}