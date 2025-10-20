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
          backgroundColor: "#1f1f1f",
          padding: "10px",
          border: "1px solid #e33",
          borderRadius: "6px",
          color: "#fff",
          maxWidth: 300,
        }}
      >
        <div style={{ marginBottom: 6 }}>
          <strong>{data.contestName}</strong>
        </div>
        <div>Rank: {data.rank}</div>
        <div>Rating: {data.rating}</div>
        <div style={{ fontSize: 12, opacity: 0.8, marginTop: 6 }}>
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
        <div style={{ color: "#fff" }}>No rating history found for this user.</div>
      ) : (
        <div className="rating-container" style={{ width: "100%", height: 260 }}>
          <ResponsiveContainer>
            <LineChart data={ratingData}>
              <XAxis
                dataKey="date"
                stroke="#ccc"
                tick={{ fontSize: 12, fill: "#bfc7cf" }}
                tickFormatter={(d) =>
                  new Date(d).toLocaleDateString("en-IN", {
                    month: "short",
                    day: "numeric",
                  })
                }
                interval="preserveStartEnd"
              />
              <YAxis
                stroke="#ccc"
                tick={{ fontSize: 12, fill: "#bfc7cf" }}
                domain={[
                  (dataMin) => Math.floor((dataMin - 100) / 100) * 100,
                  (dataMax) => Math.ceil((dataMax + 100) / 100) * 100,
                ]}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="rating"
                stroke="#ff4d4f"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
