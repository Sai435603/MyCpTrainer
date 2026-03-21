import { useEffect, useState } from "react";
import "../styles/Contests.css";
import { BASE_URL } from "../constants.js";

const logoMap = {
  Codeforces: "/images/CodeforcesLogo.png",
  CodeChef:   "/images/CodeChefLogo.svg",
  AtCoder:    "/images/AtcoderLogo.png",
  LeetCode:   "/images/leetcodeLogo.webp",
};

function getCountdown(startIso) {
  const now = Date.now();
  const start = new Date(startIso).getTime();
  const diff = start - now;
  if (diff <= 0) return "Starting now!";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  parts.push(`${mins}m`);
  return `Starts in ${parts.join(" ")}`;
}

export default function Contests() {
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [, setTick] = useState(0);

  useEffect(() => {
    async function fetchUpcomingContests() {
      if (localStorage.getItem("upcomingContests")) {
        const cachedContests = JSON.parse(localStorage.getItem("upcomingContests"));
        const cachedTime = localStorage.getItem("contestsFetchedAt");
        const now = Date.now();
        if (cachedTime && now - cachedTime < 24 * 60 * 60 * 1000) {
          setContests(cachedContests);
          setLoading(false);
          return;
        }
      }
      try {
        const res = await fetch(`${BASE_URL}/api/contests`);
        const data = await res.json();
        const arr = Array.isArray(data) ? data : Object.values(data);
        localStorage.setItem("upcomingContests", JSON.stringify(arr));
        localStorage.setItem("contestsFetchedAt", Date.now());
        setContests(arr);
      } catch (err) {
        console.error("Failed to load contests:", err);
        setContests([]);
      } finally {
        setLoading(false);
      }
    }
    fetchUpcomingContests();
  }, []);

  // Update countdown every minute
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="contests">
        <h2 className="title">Upcoming Contests</h2>
        <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
          Loading contests…
        </div>
      </div>
    );
  }

  if (!contests.length) {
    return (
      <div className="contests">
        <h2 className="title">Upcoming Contests</h2>
        <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
          No upcoming contests found.
        </div>
      </div>
    );
  }

  return (
    <div className="contests">
      <h2 className="title">Upcoming Contests</h2>
      <ul className="contest-list">
        {contests.map((c) => (
          <li key={`${c.platform}-${c.name}`} className="contest-item">
            <img
              className="contest-logo"
              src={logoMap[c.platform] || "/images/defaultLogo.png"}
              alt={`${c.platform} logo`}
            />
            <div className="contest-details">
              <div className="contest-name">{c.name}</div>
              <div className="contest-date">
                {new Date(c.start).toLocaleString("en-IN", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
              <div className="contest-countdown">{getCountdown(c.start)}</div>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginTop: "4px" }}>
                <span className={`contest-platform-badge ${c.platform}`}>{c.platform}</span>
                <a
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="contest-link"
                >
                  Register →
                </a>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
