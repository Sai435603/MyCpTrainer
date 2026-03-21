import React, { useContext } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import "../styles/Rating.css";
import MainAppContext from "../contexts/MainAppContext.jsx";

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div
        style={{
          backgroundColor: "#16161e",
          padding: "12px 16px",
          border: "1px solid rgba(124, 58, 237, 0.3)",
          borderRadius: "12px",
          color: "#f4f4f5",
          maxWidth: 280,
          boxShadow: "0 8px 32px rgba(124, 58, 237, 0.2)",
        }}
      >
        <div style={{ marginBottom: 6, fontWeight: 600, fontSize: "0.9rem" }}>
          {data.contestName}
        </div>
        <div style={{ fontSize: "0.8rem", color: "#a1a1aa" }}>Rank: {data.rank}</div>
        <div style={{ fontSize: "0.85rem", color: "#a78bfa", fontWeight: 600 }}>Rating: {data.rating}</div>
        <div style={{ fontSize: "0.75rem", opacity: 0.6, marginTop: 6 }}>
          {new Date(data.date).toLocaleDateString("en-IN", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </div>
      </div>
    );
  }
  return null;
};

export default function Rating() {
  const { ratingData, userr } = useContext(MainAppContext);
  const hasData = ratingData && ratingData.length > 0;

  return (
    <section className="rating-chart" style={{ width: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
        <h2>Rating ({userr})</h2>
      </div>

      {!hasData ? (
        <div style={{ color: "var(--text-muted)", fontStyle: "italic", padding: "2rem", textAlign: "center" }}>
          No rating history found for this user.
        </div>
      ) : (
        <div className="rating-container" style={{ width: "100%", height: 260 }}>
          <ResponsiveContainer>
            <LineChart data={ratingData}>
              <XAxis
                dataKey="date"
                stroke="#71717a"
                tick={{ fontSize: 11, fill: "#a1a1aa" }}
                tickFormatter={(d) =>
                  new Date(d).toLocaleDateString("en-IN", {
                    month: "short",
                    day: "numeric",
                  })
                }
                interval="preserveStartEnd"
              />
              <YAxis
                stroke="#71717a"
                tick={{ fontSize: 11, fill: "#a1a1aa" }}
                domain={[
                  (dataMin) => Math.floor((dataMin - 100) / 100) * 100,
                  (dataMax) => Math.ceil((dataMax + 100) / 100) * 100,
                ]}
              />
              <Tooltip content={<CustomTooltip />} />
              <defs>
                <linearGradient id="ratingGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#7c3aed" />
                  <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
              </defs>
              <Line
                type="monotone"
                dataKey="rating"
                stroke="url(#ratingGradient)"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "#7c3aed", stroke: "#a855f7", strokeWidth: 1 }}
                activeDot={{ r: 6, fill: "#a855f7", stroke: "#fff", strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
