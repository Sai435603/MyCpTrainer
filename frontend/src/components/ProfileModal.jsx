import { useState } from "react";
import "../styles/ProfileModal.css";
import { BASE_URL } from "../constants.js";

export default function ProfileModal({ profile, onClose, onUpdate }) {
  const [cfInput, setCfInput] = useState(profile?.cfHandle || "");
  const [lcInput, setLcInput] = useState(profile?.lcHandle || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const getAuthHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  });

  const handleLink = async (platform, handle) => {
    if (!handle.trim()) return setError(`Enter your ${platform === "codeforces" ? "Codeforces" : "LeetCode"} username.`);
    setLoading(true); setError(null); setSuccess(null);
    try {
      const res = await fetch(`${BASE_URL}/api/profile/link`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ platform, handle: handle.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to link.");
      setSuccess(`${platform === "codeforces" ? "Codeforces" : "LeetCode"} profile linked!`);
      onUpdate(data);
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  const handleUnlink = async (platform) => {
    setLoading(true); setError(null); setSuccess(null);
    try {
      const res = await fetch(`${BASE_URL}/api/profile/link`, {
        method: "DELETE",
        headers: getAuthHeaders(),
        body: JSON.stringify({ platform }),
      });
      if (!res.ok) throw new Error("Failed to unlink.");
      if (platform === "codeforces") {
        setSuccess("Codeforces profile unlinked.");
        setCfInput("");
        onUpdate({ cfHandle: null, cfLinked: false, lcHandle: profile.lcHandle, lcLinked: profile.lcLinked });
      } else {
        setSuccess("LeetCode profile unlinked.");
        setLcInput("");
        onUpdate({ lcHandle: null, lcLinked: false, cfHandle: profile.cfHandle, cfLinked: profile.cfLinked });
      }
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  return (
    <div className="pm-overlay" onClick={onClose}>
      <div className="pm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="pm-header">
          <h3>Manage Profiles</h3>
          <button className="pm-close" onClick={onClose}>✕</button>
        </div>

        {/* Codeforces */}
        <div className="pm-section">
          <div className="pm-platform-row">
            <span className="pm-platform-icon cf-icon">CF</span>
            <span className="pm-platform-name">Codeforces</span>
            <span className={`pm-status ${profile?.cfLinked ? "linked" : "unlinked"}`}>
              {profile?.cfLinked ? "✓ Linked" : "Not linked"}
            </span>
          </div>
          {profile?.cfLinked ? (
            <div className="pm-handle-display">
              <span>{profile.cfHandle}</span>
              <button className="pm-unlink" onClick={() => handleUnlink("codeforces")} disabled={loading}>
                {loading ? "..." : "Unlink"}
              </button>
            </div>
          ) : (
            <div className="pm-link-form">
              <input
                type="text"
                value={cfInput}
                onChange={(e) => setCfInput(e.target.value)}
                placeholder="Your Codeforces handle"
                disabled={loading}
                className="pm-input"
              />
              <button className="pm-link-btn" onClick={() => handleLink("codeforces", cfInput)} disabled={loading}>
                {loading ? "Linking..." : "Link"}
              </button>
            </div>
          )}
        </div>

        <div className="pm-divider" />

        {/* LeetCode */}
        <div className="pm-section">
          <div className="pm-platform-row">
            <span className="pm-platform-icon lc-icon">LC</span>
            <span className="pm-platform-name">LeetCode</span>
            <span className={`pm-status ${profile?.lcLinked ? "linked" : "unlinked"}`}>
              {profile?.lcLinked ? "✓ Linked" : "Not linked"}
            </span>
          </div>
          {profile?.lcLinked ? (
            <div className="pm-handle-display">
              <span>{profile.lcHandle}</span>
              <button className="pm-unlink" onClick={() => handleUnlink("leetcode")} disabled={loading}>
                {loading ? "..." : "Unlink"}
              </button>
            </div>
          ) : (
            <div className="pm-link-form">
              <input
                type="text"
                value={lcInput}
                onChange={(e) => setLcInput(e.target.value)}
                placeholder="Your LeetCode username"
                disabled={loading}
                className="pm-input"
              />
              <button className="pm-link-btn" onClick={() => handleLink("leetcode", lcInput)} disabled={loading}>
                {loading ? "Linking..." : "Link"}
              </button>
            </div>
          )}
        </div>

        <div className="pm-divider" />

        {/* Reset Heatmap */}
        <div className="pm-section">
          <div className="pm-platform-row">
            <span className="pm-platform-name" style={{ fontSize: "0.85rem" }}>Heatmap tracks app solves only</span>
          </div>
          <button
            className="pm-unlink"
            style={{ alignSelf: "flex-start" }}
            onClick={async () => {
              setLoading(true); setError(null); setSuccess(null);
              try {
                const res = await fetch(`${BASE_URL}/api/heatmap/reset`, {
                  method: "POST",
                  headers: getAuthHeaders(),
                });
                if (!res.ok) throw new Error("Failed to reset.");
                setSuccess("Heatmap reset! It now tracks only app-level solves.");
              } catch (err) { setError(err.message); }
              finally { setLoading(false); }
            }}
            disabled={loading}
          >
            {loading ? "..." : "Reset Heatmap Data"}
          </button>
        </div>

        {error && <div className="pm-error">{error}</div>}
        {success && <div className="pm-success">{success}</div>}
      </div>
    </div>
  );
}
