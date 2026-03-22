import React, { useState, useEffect, useRef, useContext, useCallback } from "react";
import { FaSearch, FaUserFriends, FaFire } from "react-icons/fa";
import MainAppContext from "../contexts/MainAppContext.jsx";
import "../styles/Friends.css";
import { BASE_URL } from "../constants.js";

function getRatingClass(rating) {
  if (!rating || rating < 1200) return "rating-newbie";
  if (rating < 1400) return "rating-pupil";
  if (rating < 1600) return "rating-specialist";
  if (rating < 1900) return "rating-expert";
  if (rating < 2100) return "rating-cm";
  if (rating < 2300) return "rating-master";
  if (rating < 2400) return "rating-im";
  if (rating < 2600) return "rating-gm";
  if (rating < 3000) return "rating-igm";
  return "rating-legendary";
}

function getRatingTitle(rating) {
  if (!rating || rating < 1200) return "Newbie";
  if (rating < 1400) return "Pupil";
  if (rating < 1600) return "Specialist";
  if (rating < 1900) return "Expert";
  if (rating < 2100) return "Candidate Master";
  if (rating < 2300) return "Master";
  if (rating < 2400) return "International Master";
  if (rating < 2600) return "Grandmaster";
  if (rating < 3000) return "International Grandmaster";
  return "Legendary Grandmaster";
}

export default function Friends() {
  const { userr } = useContext(MainAppContext);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [friends, setFriends] = useState([]);
  const [followingSet, setFollowingSet] = useState(new Set());
  const [searching, setSearching] = useState(false);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [actionLoading, setActionLoading] = useState(null); // handle that's loading
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef(null);
  const debounceRef = useRef(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  };

  // Fetch friends list
  const fetchFriends = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/friends`, {
        headers: { ...getAuthHeaders() },
      });
      if (res.ok) {
        const data = await res.json();
        setFriends(data);
        setFollowingSet(new Set(data.map((f) => f.handle)));
      }
    } catch (err) {
      console.error("fetchFriends error:", err);
    } finally {
      setLoadingFriends(false);
    }
  }, []);

  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `${BASE_URL}/api/friends/search?q=${encodeURIComponent(searchQuery.trim())}`,
          { headers: { ...getAuthHeaders() } }
        );
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
          setShowDropdown(true);
        }
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  // Follow a user
  const handleFollow = async (handle) => {
    setActionLoading(handle);
    try {
      const res = await fetch(`${BASE_URL}/api/friends/follow`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ handle }),
      });
      if (res.ok) {
        setFollowingSet((prev) => new Set([...prev, handle]));
        await fetchFriends();
      }
    } catch (err) {
      console.error("Follow error:", err);
    } finally {
      setActionLoading(null);
    }
  };

  // Unfollow a user
  const handleUnfollow = async (handle) => {
    setActionLoading(handle);
    try {
      const res = await fetch(`${BASE_URL}/api/friends/unfollow`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ handle }),
      });
      if (res.ok) {
        setFollowingSet((prev) => {
          const next = new Set(prev);
          next.delete(handle);
          return next;
        });
        setFriends((prev) => prev.filter((f) => f.handle !== handle));
      }
    } catch (err) {
      console.error("Unfollow error:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const FollowButton = ({ handle }) => {
    const isFollowing = followingSet.has(handle);
    const isLoading = actionLoading === handle;

    return (
      <button
        className={`follow-btn ${isFollowing ? "following" : "follow"}`}
        onClick={() => (isFollowing ? handleUnfollow(handle) : handleFollow(handle))}
        disabled={isLoading}
      >
        {isLoading ? "…" : isFollowing ? "Following" : "Follow"}
      </button>
    );
  };

  return (
    <div className="friends-container">
      {/* Search */}
      <div className="friends-search-section" ref={searchRef}>
        <h2>Find Friends</h2>
        <div className="search-input-wrapper">
          <FaSearch className="search-icon" />
          <input
            type="text"
            className="friends-search-input"
            placeholder="Search by handle…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => {
              if (searchResults.length > 0) setShowDropdown(true);
            }}
          />
        </div>

        {showDropdown && (
          <div className="search-results-dropdown">
            {searching ? (
              <div className="search-loading">Searching…</div>
            ) : searchResults.length === 0 ? (
              <div className="search-no-results">No users found</div>
            ) : (
              searchResults.map((user) => (
                <div key={user.handle} className="search-result-item">
                  <div className="search-result-info">
                    <div className="search-result-avatar">
                      {user.handle.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="search-result-handle">{user.handle}</div>
                      <div className="search-result-rating">
                        <span className={getRatingClass(user.rating)}>
                          {getRatingTitle(user.rating)}
                        </span>
                        {" · "}
                        Rating {user.rating || 800}
                        {user.streak > 0 && ` · 🔥 ${user.streak}d`}
                      </div>
                    </div>
                  </div>
                  <FollowButton handle={user.handle} />
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Following List */}
      <div className="friends-list-section">
        <h2>
          <FaUserFriends style={{ color: "var(--violet-400)" }} />
          Following
          {friends.length > 0 && (
            <span className="friends-count-badge">{friends.length}</span>
          )}
        </h2>

        {loadingFriends ? (
          <div className="chart-spinner">
            <div className="spinner-circle"></div>
            <div>Loading friends…</div>
          </div>
        ) : friends.length === 0 ? (
          <div className="friends-empty">
            <div className="friends-empty-icon">👥</div>
            <h3>No friends yet</h3>
            <p>
              Search for other competitive programmers above and follow them to
              stay motivated by tracking their progress!
            </p>
          </div>
        ) : (
          <div className="friends-grid">
            {friends.map((friend) => (
              <div key={friend.handle} className="friend-card">
                <div className="friend-card-header">
                  <div className="friend-avatar">
                    {friend.handle.charAt(0).toUpperCase()}
                  </div>
                  <div className="friend-identity">
                    <div className="friend-handle">{friend.handle}</div>
                    <div className="friend-platforms">
                      {friend.cfHandle && (
                        <span className="friend-platform-tag cf">CF</span>
                      )}
                      {friend.lcHandle && (
                        <span className="friend-platform-tag lc">LC</span>
                      )}
                    </div>
                  </div>
                  <FollowButton handle={friend.handle} />
                </div>

                <div className="friend-stats">
                  <div className="friend-stat">
                    <div className="friend-stat-label">Rating</div>
                    <div
                      className={`friend-stat-value rating ${getRatingClass(friend.rating)}`}
                    >
                      {friend.rating || 800}
                    </div>
                  </div>
                  <div className="friend-stat">
                    <div className="friend-stat-label">Streak</div>
                    <div className="friend-stat-value streak">
                      <FaFire
                        style={{
                          fontSize: "0.85rem",
                          marginRight: 4,
                          verticalAlign: "middle",
                        }}
                      />
                      {friend.streak || 0}d
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
