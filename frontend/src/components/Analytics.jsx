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
// Unique bar colors by rating‐bucket (800 → 3500)
const BAR_COLORS = [
  "#B0B0B0", // 800
  "#D0D0D0", // 900
  "#D0D0D0", // 1000
  "#D0D0D0", // 1100
  "#7FB800", // 1200
  "#7FB800", // 1300
  "#7FB800", // 1400
  "#7FB800", // 1500
  "#00A3B5", // 1600
  "#00A3B5", // 1700
  "#00A3B5", // 1800
  "#00A3B5", // 1900
  "#00A3B5", // 2000
  "#FF9E3F", // 2100
  "#FF9E3F", // 2200
  "#FF9E3F", // 2300
  "#E5473D", // 2400
  "#E5473D", // 2500
  "#D32F2F", // 2600
  "#D32F2F", // 2700
  "#D32F2F", // 2800
  "#D32F2F", // 2900
  "#9C1C1C", // 3000
  "#9C1C1C", // 3100
  "#9C1C1C", // 3200
  "#660D0D", // 3300
  "#660D0D", // 3400
  "#660D0D", // 3500
];

// Reusable pie slice colors (optional)
const PIE_COLORS = [
  "#14b8a6",
  "#00d8c0",
  "#82ca9d",
  "#8dd1e1",
  "#ffc658",
  "#a4de6c",
  "#d0ed57",
  "#ffc0cb",
  "#d88884",
  "#e182ca",
  "#58ffc6",
];

export default function Analytics() {
  const [solvedData, setSolvedData] = useState([]);
  const [tagsData, setTagsData] = useState([]);
  const [unsolvedList, setUnsolvedList] = useState([]);
  const { userr } = useContext(MainAppContext);
  const handle = userr;

  useEffect(() => {
    async function fetchData() {
      const resp = await fetch(
        `${BASE_URL}/api/analytics/${handle}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }
      );
      if (!resp.ok) {
        console.error("Failed to fetch analytics data");
        return;
      }

      const { result: subs } = await resp.json();

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

      setSolvedData(
        Object.entries(solvedCount)
          .map(([rating, count]) => ({ rating, count }))
          .sort((a, b) => +a.rating - +b.rating)
      );

      const tagCount = {};
      Object.values(firstOK).forEach((p) =>
        p.tags.forEach((t) => (tagCount[t] = (tagCount[t] || 0) + 1))
      );
      setTagsData(
        Object.entries(tagCount)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
      );

      const tried = {};
      subs.forEach((s) => {
        tried[`${s.problem.contestId}-${s.problem.index}`] = s.problem;
      });
      setUnsolvedList(
        Object.entries(tried)
          .filter(([id]) => !seen.has(id))
          .map(([, pr]) => `${pr.contestId}-${pr.index}`)
      );
    }
    fetchData();
  }, [handle]);

  return (
    <div className="analytics-container">
      {/* Problem Ratings */}
      <div className="panel">
        <h2>Problem Ratings</h2>
        <div className="chart-wrapper">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={solvedData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.1)"
              />
              <XAxis dataKey="rating" stroke="#fff" />
              <YAxis stroke="#fff" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#191a20",
                  borderColor: "#14b8a6",
                  color: "#fff",
                }}
              />
              <Bar dataKey="count">
                {solvedData.map((_, idx) => (
                  <Cell key={idx} fill={BAR_COLORS[idx] || "#888"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tags Solved */}
      <div className="panel">
        <h2>Tags Solved</h2>
        <div className="chart-wrapper">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={tagsData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={{ fill: "#fff" }}
              >
                {tagsData.map((_, idx) => (
                  <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Legend
                wrapperStyle={{
                  maxHeight: 180,
                  overflowY: "auto",
                  paddingRight: 8,
                }}
                formatter={(value) => (
                  <span style={{ color: "#fff" }}>{value}</span>
                )}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#191a20",
                  borderColor: "#14b8a6",
                  color: "#fff",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Unsolved Problems */}
      <div className="panel">
        <h2>Unsolved Problems (Count: {unsolvedList.length})</h2>
        <div className="unsolved-list">
          {unsolvedList.map((code) => (
            <span key={code}>{code}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
