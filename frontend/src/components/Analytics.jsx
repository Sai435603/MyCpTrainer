import React, { useEffect, useState, useContext } from "react";
import MainAppContext from "../contexts/MainAppContext.jsx";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Legend,
  Cell,
} from "recharts";
import "../styles/Analytics.css";
import { BASE_URL } from "../constants.js";

// Violet spectrum for bar chart
const BAR_COLORS = [
  "#71717a", "#71717a", "#71717a", "#71717a", // gray (unrated / low)
  "#22c55e", "#22c55e", "#22c55e",             // green (easy)
  "#059669", "#059669",                         // teal
  "#3b82f6", "#3b82f6", "#3b82f6",             // blue
  "#6366f1", "#6366f1",                         // indigo
  "#8b5cf6", "#8b5cf6",                         // violet
  "#a855f7", "#a855f7",                         // purple
  "#d946ef", "#d946ef",                         // fuchsia
  "#ec4899", "#ec4899",                         // pink
  "#ef4444", "#ef4444",                         // red
  "#dc2626", "#dc2626", "#dc2626", "#dc2626",  // dark red
];

const PIE_COLORS = [
  "#8b5cf6", "#a855f7", "#c084fc", "#7c3aed",
  "#6366f1", "#818cf8", "#a5b4fc", "#4f46e5",
  "#d946ef", "#f472b6", "#fb923c",
];

export default function Analytics() {
  const [solvedData, setSolvedData] = useState([]);
  const [tagsData, setTagsData] = useState([]);
  const [unsolvedList, setUnsolvedList] = useState([]);
  const [loading, setLoading] = useState(true);
  const { userr } = useContext(MainAppContext);
  const handle = userr;

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  };

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      try {
        const resp = await fetch(`${BASE_URL}/api/analytics/${handle}`, {
          headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        });

        if (!resp.ok) {
          console.error("Failed to fetch analytics data:", resp.status);
          if (!cancelled) setLoading(false);
          return;
        }

        const { result: subs } = await resp.json();
        if (cancelled) return;

        const seen = new Set();
        const solvedCount = {};
        const firstOK = {};

        subs.forEach((s) => {
          const id = `${s.problem.contestId}-${s.problem.index}`;
          if (s.verdict === "OK" && !seen.has(id)) {
            seen.add(id);
            const bucket = Math.floor((s.problem.rating || 0) / 100) * 100;
            solvedCount[bucket] = (solvedCount[bucket] || 0) + 1;
            firstOK[id] = s.problem;
          }
        });

        const solvedArr = Object.entries(solvedCount)
          .map(([rating, count]) => ({ rating, count }))
          .sort((a, b) => +a.rating - +b.rating);

        const tagCount = {};
        Object.values(firstOK).forEach((p) =>
          p.tags.forEach((t) => (tagCount[t] = (tagCount[t] || 0) + 1))
        );

        const tagsArr = Object.entries(tagCount)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value);

        const tried = {};
        subs.forEach((s) => {
          tried[`${s.problem.contestId}-${s.problem.index}`] = s.problem;
        });
        const unsolved = Object.entries(tried)
          .filter(([id]) => !seen.has(id))
          .map(([, pr]) => `${pr.contestId}-${pr.index}`);

        setSolvedData(solvedArr);
        setTagsData(tagsArr);
        setUnsolvedList(unsolved);
      } catch (err) {
        if (!cancelled) console.error("Error fetching analytics:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (handle) fetchData();
    else setLoading(false);

    return () => { cancelled = true; };
  }, [handle]);

  const renderLoading = (label) => (
    <div className="chart-spinner">
      <div className="spinner-circle"></div>
      <div>{label}</div>
    </div>
  );

  const renderNoData = (label) => (
    <div className="chart-no-data">{label}</div>
  );

  return (
    <div className="analytics-container">
      <div className="panel">
        <h2>Problem Ratings Distribution</h2>
        {loading
          ? renderLoading("Loading ratings…")
          : solvedData.length === 0
          ? renderNoData("No solved problems yet.")
          : (
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={solvedData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="rating" stroke="#71717a" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                  <YAxis stroke="#71717a" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#16161e",
                      borderColor: "rgba(124, 58, 237, 0.3)",
                      color: "#f4f4f5",
                      borderRadius: "12px",
                      boxShadow: "0 8px 32px rgba(124, 58, 237, 0.2)",
                    }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {solvedData.map((_, idx) => (
                      <Cell key={idx} fill={BAR_COLORS[idx] || "#8b5cf6"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
      </div>

      <div className="panel">
        <h2>Tags Distribution</h2>
        {loading
          ? renderLoading("Loading tags…")
          : tagsData.length === 0
          ? renderNoData("No tags to display.")
          : (
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={tagsData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={{ fill: "#a1a1aa", fontSize: 11 }}
                  >
                    {tagsData.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend
                    wrapperStyle={{ maxHeight: 180, overflowY: "auto", paddingRight: 8 }}
                    formatter={(value) => <span style={{ color: "#a1a1aa", fontSize: "0.8rem" }}>{value}</span>}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#16161e",
                      borderColor: "rgba(124, 58, 237, 0.3)",
                      color: "#f4f4f5",
                      borderRadius: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
      </div>

      <div className="panel">
        <h2>Unsolved Problems ({unsolvedList.length})</h2>
        <div className="unsolved-list">
          {loading
            ? renderLoading("Loading unsolved…")
            : unsolvedList.length === 0
            ? <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>All attempted problems solved! 🎉</span>
            : unsolvedList.slice(0, 50).map((code) => <span key={code}>{code}</span>)
          }
          {!loading && unsolvedList.length > 50 && (
            <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>
              …and {unsolvedList.length - 50} more
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
