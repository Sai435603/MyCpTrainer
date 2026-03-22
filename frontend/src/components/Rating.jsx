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
      <div className="rating-tooltip cf-tooltip">
        <div className="rt-contest">{data.contestName}</div>
        <div className="rt-rank">Rank: {data.rank}</div>
        <div className="rt-rating">Rating: {data.rating}</div>
        <div className="rt-date">
          {new Date(data.date).toLocaleDateString("en-IN", {
            year: "numeric", month: "short", day: "numeric",
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
      <div className="rating-tooltip lc-tooltip">
        <div className="rt-contest lc-accent">{data.contestName}</div>
        <div className="rt-rank">Rank: {data.rank}</div>
        <div className="rt-rating lc-accent">Rating: {data.rating}</div>
        <div className="rt-date">
          {new Date(data.date).toLocaleDateString("en-IN", {
            year: "numeric", month: "short", day: "numeric",
          })}
        </div>
      </div>
    );
  }
  return null;
};

export default function Rating() {
  const {
    ratingData, lcRatingData, setRatingData, setLcRatingData,
    profileData, userr,
  } = useContext(MainAppContext);

  const [activeTab, setActiveTab] = useState("cf");
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

  // Auto-select the first linked platform
  useEffect(() => {
    if (cfLinked) setActiveTab("cf");
    else if (lcLinked) setActiveTab("lc");
  }, [cfLinked, lcLinked]);

  // Fetch CF rating when linked
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

  // Fetch LC rating when linked
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
  const isCF = activeTab === "cf";
  const currentData = isCF ? ratingData : lcRatingData;
  const currentLoading = isCF ? cfLoading : lcLoading;
  const currentLinked = isCF ? cfLinked : lcLinked;

  return (
    <section className="rating-chart" style={{ width: "100%" }}>
      {/* Toggle Header */}
      <div className="rating-header">
        <h2>Rating</h2>
        {(cfLinked || lcLinked) && (
          <div className="rating-toggle">
            {cfLinked && (
              <button
                className={`rating-toggle-btn ${activeTab === "cf" ? "active cf-active" : ""}`}
                onClick={() => setActiveTab("cf")}
              >
                CF
              </button>
            )}
            {lcLinked && (
              <button
                className={`rating-toggle-btn ${activeTab === "lc" ? "active lc-active" : ""}`}
                onClick={() => setActiveTab("lc")}
              >
                LC
              </button>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      {neitherLinked ? (
        <div className="rating-empty">
          Link your Codeforces or LeetCode profile to see rating graphs.
        </div>
      ) : !currentLinked ? (
        <div className="rating-empty">
          {isCF ? "Link Codeforces" : "Link LeetCode"} profile to see this graph.
        </div>
      ) : currentLoading ? (
        <div className="chart-spinner">
          <div className="spinner-circle"></div>
          <div>Loading {isCF ? "CF" : "LC"} rating…</div>
        </div>
      ) : currentData.length === 0 ? (
        <div className="rating-empty">
          No {isCF ? "Codeforces" : "LeetCode"} contest history found.
        </div>
      ) : (
        <div className="rating-container" style={{ width: "100%", height: 250 }}>
          <ResponsiveContainer>
            <LineChart data={currentData}>
              <XAxis
                dataKey="date"
                stroke="#71717a"
                tick={{ fontSize: 11, fill: "#a1a1aa" }}
                tickFormatter={(d) =>
                  new Date(d).toLocaleDateString("en-IN", {
                    month: "short", day: "numeric",
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
              <Tooltip content={isCF ? <CFTooltip /> : <LCTooltip />} />
              <Line
                type="monotone"
                dataKey="rating"
                stroke={isCF ? "#ffffff" : "#f59e0b"}
                strokeWidth={2}
                dot={{
                  r: 3,
                  fill: isCF ? "#ffffff" : "#f59e0b",
                  stroke: isCF ? "#7c3aed" : "#92400e",
                  strokeWidth: 1.5,
                }}
                activeDot={{
                  r: 6,
                  fill: isCF ? "#ffffff" : "#f59e0b",
                  stroke: isCF ? "#7c3aed" : "#92400e",
                  strokeWidth: 2,
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
