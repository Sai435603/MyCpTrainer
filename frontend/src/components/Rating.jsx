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
          color: "#ffffff",
          maxWidth: 280,
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        }}
      >
        <div style={{ marginBottom: 6, fontWeight: 600, fontSize: "0.9rem", color: "#ffffff" }}>
          {data.contestName}
        </div>
        <div style={{ fontSize: "0.8rem", color: "#d4d4d8" }}>Rank: {data.rank}</div>
        <div style={{ fontSize: "0.85rem", color: "#ffffff", fontWeight: 600 }}>Rating: {data.rating}</div>
        <div style={{ fontSize: "0.75rem", color: "#a1a1aa", marginTop: 6 }}>
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
      <h2 style={{ textAlign: "center", color: "#ffffff", marginBottom: "8px" }}>
        Rating ({userr})
      </h2>

      {!hasData ? (
        <div style={{ color: "#a1a1aa", fontStyle: "italic", padding: "2rem", textAlign: "center" }}>
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
              <Line
                type="monotone"
                dataKey="rating"
                stroke="#ffffff"
                strokeWidth={2}
                dot={{ r: 3, fill: "#ffffff", stroke: "#7c3aed", strokeWidth: 1.5 }}
                activeDot={{ r: 6, fill: "#ffffff", stroke: "#7c3aed", strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
