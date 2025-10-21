import { useEffect, useState } from "react";
import "../styles/Contests.css";
import { BASE_URL } from "../constants.js";
const logoMap = {
  Codeforces: "/images/CodeforcesLogo.png",
  CodeChef:    "/images/CodeChefLogo.svg",
  AtCoder:     "/images/AtcoderLogo.png",
  LeetCode:    "/images/leetcodeLogo.webp",
};

export default function Contests() {
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    async function fetchUpcomingContests() {
      if(localStorage.getItem("upcomingContests")){ 
        const cachedContests = JSON.parse(localStorage.getItem("upcomingContests")); 
        const cachedTime = localStorage.getItem("contestsFetchedAt");
        const now = Date.now();
        if(cachedTime && now - cachedTime < 24 * 60 * 60 * 1000){
          setContests(cachedContests);
          setLoading(false);
          return;
        }
      }
      try {
        const res = await fetch(`${BASE_URL}/api/contests`);
        const data = await res.json();
        const arr = Array.isArray(data)
          ? data
          : 
            Object.values(data);
        // console.log(arr);
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

  if (loading) {
    return <div className="contests">Loading contests…</div>;
  }

  if (!contests.length) {
    return <div className="contests">No contests found.</div>;
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
                {new Date(c.start).toLocaleString()}
              </div>
              <a
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
                className="contest-link"
              >
                View on {c.platform}
              </a>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
