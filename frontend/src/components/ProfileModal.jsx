import { useState } from "react";
import "../styles/ProfileModal.css";
import { BASE_URL } from "../constants.js";

export default function ProfileModal({ profile, onClose, onUpdate }) {
  const [lcInput, setLcInput] = useState(profile?.lcHandle || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const getAuthHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  });

  const handleLinkLC = async () => {
    if (!lcInput.trim()) return setError("Enter your LeetCode username.");
    setLoading(true); setError(null); setSuccess(null);
    try {
      const res = await fetch(`${BASE_URL}/api/profile/link`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ platform: "leetcode", handle: lcInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to link.");
      setSuccess("LeetCode profile linked!");
      onUpdate(data);
    } catch (err) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  const handleUnlinkLC = async () => {
    setLoading(true); setError(null); setSuccess(null);
    try {
      const res = await fetch(`${BASE_URL}/api/profile/link`, {
        method: "DELETE",
        headers: getAuthHeaders(),
        body: JSON.stringify({ platform: "leetcode" }),
      });
      if (!res.ok) throw new Error("Failed to unlink.");
      setSuccess("LeetCode profile unlinked.");
      setLcInput("");
      onUpdate({ lcHandle: null, lcLinked: false, cfHandle: profile.cfHandle, cfLinked: profile.cfLinked });
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
            <span className="pm-status linked">✓ Linked</span>
          </div>
          <div className="pm-handle-display">
            <span>{profile?.cfHandle || profile?.handle || "—"}</span>
          </div>
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
              <button className="pm-unlink" onClick={handleUnlinkLC} disabled={loading}>
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
              <button className="pm-link-btn" onClick={handleLinkLC} disabled={loading}>
                {loading ? "Linking..." : "Link"}
              </button>
            </div>
          )}
        </div>

        {error && <div className="pm-error">{error}</div>}
        {success && <div className="pm-success">{success}</div>}
      </div>
    </div>
  );
}
