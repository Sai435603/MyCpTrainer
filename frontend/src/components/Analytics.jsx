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

const BAR_COLORS = [
  "#B0B0B0", "#D0D0D0", "#D0D0D0", "#D0D0D0", "#7FB800", "#7FB800",
  "#7FB800", "#7FB800", "#00A3B5", "#00A3B5", "#00A3B5", "#00A3B5",
  "#00A3B5", "#FF9E3F", "#FF9E3F", "#FF9E3F", "#E5473D", "#E5473D",
  "#D32F2F", "#D32F2F", "#D32F2F", "#D32F2F", "#9C1C1C", "#9C1C1C",
  "#9C1C1C", "#660D0D", "#660D0D", "#660D0D",
];

const PIE_COLORS = [
  "#14b8a6", "#00d8c0", "#82ca9d", "#8dd1e1", "#ffc658",
  "#a4de6c", "#d0ed57", "#ffc0cb", "#d88884", "#e182ca", "#58ffc6",
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
        <h2>Problem Ratings</h2>
        {loading
          ? renderLoading("Loading ratings…")
          : solvedData.length === 0
          ? renderNoData("No solved problems yet.")
          : (
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={solvedData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="rating" stroke="#fff" />
                  <YAxis stroke="#fff" />
                  <Tooltip contentStyle={{ backgroundColor: "#191a20", borderColor: "#14b8a6", color: "#fff" }} />
                  <Bar dataKey="count">
                    {solvedData.map((_, idx) => <Cell key={idx} fill={BAR_COLORS[idx] || "#888"} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
      </div>

      <div className="panel">
        <h2>Tags Solved</h2>
        {loading
          ? renderLoading("Loading tags…")
          : tagsData.length === 0
          ? renderNoData("No tags to display.")
          : (
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={tagsData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={{ fill: "#fff" }}>
                    {tagsData.map((_, idx) => <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />)}
                  </Pie>
                  <Legend wrapperStyle={{ maxHeight: 180, overflowY: "auto", paddingRight: 8 }}
                          formatter={(value) => <span style={{ color: "#fff" }}>{value}</span>} />
                  <Tooltip contentStyle={{ backgroundColor: "#191a20", borderColor: "#14b8a6", color: "#fff" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
      </div>

      <div className="panel">
        <h2>Unsolved Problems (Count: {unsolvedList.length})</h2>
        <div className="unsolved-list">
          {loading
            ? renderLoading("Loading unsolved…")
            : unsolvedList.length === 0
            ? <span style={{ color: "#cfd8dc" }}>No unsolved problems</span>
            : unsolvedList.map((code) => <span key={code}>{code}</span>)
          }
        </div>
      </div>
    </div>
  );
}
