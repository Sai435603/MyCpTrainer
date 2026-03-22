import React, { useContext, useEffect, useState } from "react";
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
import { BASE_URL } from "../constants.js";

const CFTooltip = ({ active, payload }) => {
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

const LCTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div
        style={{
          backgroundColor: "#16161e",
          padding: "12px 16px",
          border: "1px solid rgba(245, 158, 11, 0.3)",
          borderRadius: "12px",
          color: "#ffffff",
          maxWidth: 280,
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        }}
      >
        <div style={{ marginBottom: 6, fontWeight: 600, fontSize: "0.9rem", color: "#f59e0b" }}>
          {data.contestName}
        </div>
        <div style={{ fontSize: "0.8rem", color: "#d4d4d8" }}>Rank: {data.rank}</div>
        <div style={{ fontSize: "0.85rem", color: "#f59e0b", fontWeight: 600 }}>Rating: {data.rating}</div>
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

function RatingChart({ data, label, lineColor, dotStroke, tooltip, accentBorder }) {
  if (!data || data.length === 0) {
    return (
      <div style={{ color: "#a1a1aa", fontStyle: "italic", padding: "2rem", textAlign: "center" }}>
        No {label} rating history found.
      </div>
    );
  }

  return (
    <div className="rating-container" style={{ width: "100%", height: 240 }}>
      <ResponsiveContainer>
        <LineChart data={data}>
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
          <Tooltip content={tooltip} />
          <Line
            type="monotone"
            dataKey="rating"
            stroke={lineColor}
            strokeWidth={2}
            dot={{ r: 3, fill: lineColor, stroke: dotStroke, strokeWidth: 1.5 }}
            activeDot={{ r: 6, fill: lineColor, stroke: dotStroke, strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function Rating() {
  const { ratingData, lcRatingData, setRatingData, setLcRatingData, profileData, userr } =
    useContext(MainAppContext);
  const [cfLoading, setCfLoading] = useState(false);
  const [lcLoading, setLcLoading] = useState(false);
  const [cfFetched, setCfFetched] = useState(false);
  const [lcFetched, setLcFetched] = useState(false);

  const cfLinked = !!profileData?.cfLinked;
  const lcLinked = !!profileData?.lcLinked;
  const cfHandle = profileData?.cfHandle;
  const lcHandle = profileData?.lcHandle;

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  };

  // Fetch CF rating when cfLinked becomes true
  useEffect(() => {
    if (cfLinked && cfHandle && !cfFetched) {
      setCfLoading(true);
      fetch(`${BASE_URL}/api/rating/${encodeURIComponent(cfHandle)}`, {
        headers: getAuthHeaders(),
      })
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => { setRatingData(data || []); setCfFetched(true); })
        .catch(() => setRatingData([]))
        .finally(() => setCfLoading(false));
    } else if (!cfLinked) {
      setRatingData([]);
      setCfFetched(false);
    }
  }, [cfLinked, cfHandle]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch LC rating when lcLinked becomes true
  useEffect(() => {
    if (lcLinked && lcHandle && !lcFetched) {
      setLcLoading(true);
      fetch(`${BASE_URL}/api/lc-rating/${encodeURIComponent(lcHandle)}`, {
        headers: getAuthHeaders(),
      })
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => { setLcRatingData(data || []); setLcFetched(true); })
        .catch(() => setLcRatingData([]))
        .finally(() => setLcLoading(false));
    } else if (!lcLinked) {
      setLcRatingData([]);
      setLcFetched(false);
    }
  }, [lcLinked, lcHandle]); // eslint-disable-line react-hooks/exhaustive-deps

  const neitherLinked = !cfLinked && !lcLinked;

  return (
    <section className="rating-section" style={{ width: "100%" }}>
      {neitherLinked && (
        <div className="rating-chart">
          <div style={{ color: "#a1a1aa", fontStyle: "italic", padding: "2rem", textAlign: "center" }}>
            Link your Codeforces or LeetCode profile to see rating graphs.
          </div>
        </div>
      )}

      {cfLinked && (
        <div className="rating-chart" style={{ marginBottom: lcLinked ? "1rem" : 0 }}>
          <h2 style={{ textAlign: "center", color: "#ffffff", marginBottom: "8px" }}>
            <span style={{ color: "#3b82f6", fontSize: "0.7rem", fontWeight: 800, padding: "2px 8px", borderRadius: "999px", background: "rgba(59,130,246,0.15)", marginRight: "8px", verticalAlign: "middle" }}>CF</span>
            Codeforces Rating
          </h2>
          {cfLoading ? (
            <div className="chart-spinner">
              <div className="spinner-circle"></div>
              <div>Loading CF rating…</div>
            </div>
          ) : (
            <RatingChart
              data={ratingData}
              label="Codeforces"
              lineColor="#ffffff"
              dotStroke="#7c3aed"
              tooltip={<CFTooltip />}
              accentBorder="rgba(124, 58, 237, 0.3)"
            />
          )}
        </div>
      )}

      {lcLinked && (
        <div className="rating-chart">
          <h2 style={{ textAlign: "center", color: "#ffffff", marginBottom: "8px" }}>
            <span style={{ color: "#f59e0b", fontSize: "0.7rem", fontWeight: 800, padding: "2px 8px", borderRadius: "999px", background: "rgba(245,158,11,0.15)", marginRight: "8px", verticalAlign: "middle" }}>LC</span>
            LeetCode Rating
          </h2>
          {lcLoading ? (
            <div className="chart-spinner">
              <div className="spinner-circle"></div>
              <div>Loading LC rating…</div>
            </div>
          ) : (
            <RatingChart
              data={lcRatingData}
              label="LeetCode"
              lineColor="#f59e0b"
              dotStroke="#92400e"
              tooltip={<LCTooltip />}
              accentBorder="rgba(245, 158, 11, 0.3)"
            />
          )}
        </div>
      )}
    </section>
  );
}
