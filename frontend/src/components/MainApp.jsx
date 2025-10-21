import { useContext, useEffect, useState } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import LoginContext from "../contexts/LoginContext.jsx";
import MainAppContext from "../contexts/MainAppContext.jsx";
import CptrainerLoader from "../loaders/CptrainerLoader.jsx";
import Nav from "./Nav.jsx";
import Dashboard from "./Dashboard.jsx";
import Contests from "./Contests.jsx";
import Analytics from "./Analytics.jsx";
import Blogs from "./Blogs.jsx";
import Layout from "./Layout.jsx";
import { BASE_URL } from "../constants.js";
export default function MainApp() {
  const { user, setStreak } = useContext(LoginContext);
  const userr = user || "guest";
  const navigate = useNavigate();
  const [loader, setLoader] = useState(true);
  const [word, setWord] = useState("Loading your problemset...");
  const [problemSet, setProblemSet] = useState([]);
  const [ratingData, setRatingData] = useState([]);
  const [heatmapData, setHeatmapData] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);

  async function fetchAllData(userHandle) {
    setLoader(true);
    try {
      const responses = await Promise.allSettled([
        fetch(`${BASE_URL}/api/problems/${userHandle}`, {
          credentials: "include",
        }),
        fetch(`${BASE_URL}/api/rating/${userHandle}`, {
          credentials: "include",
        }),
        fetch(`${BASE_URL}/api/heatmap/${userHandle}`, {
          credentials: "include",
        }),
        fetch(`${BASE_URL}/api/streak/${userHandle}`, {
          credentials: "include",
        }),
      ]);

     
      const getJson = async (result) => {
        if (result.status === "fulfilled" && result.value.ok) {
          return result.value.json();
        }
        if (result.status === "rejected") {
          console.error("Fetch failed:", result.reason);
        } else if (!result.value.ok) {
          console.error("Fetch returned an error:", result.value.statusText);
        }
        return null;
      };

      const [problems, rating, heatmapResponse, streak] = await Promise.all([
        getJson(responses[0]),
        getJson(responses[1]),
        getJson(responses[2]),
        getJson(responses[3]),
      ]);
      // console.log(heatmapResponse.heatmap.values);
      if (problems) setProblemSet(problems);
      if (rating) setRatingData(rating);
      if (streak) setStreak(streak.streak || 0);
      // console.log(heatmapResponse);
      if (heatmapResponse?.success) {
        setHeatmapData(heatmapResponse.heatmap);
      }
    } catch (error) {
      console.error("A critical error occurred in fetchAllData:", error);
      setWord("Failed to load your data.");
    } finally {
      setLoader(false);
    }
  }

  async function handleSync() {
    setIsSyncing(true);
    try {
      const res = await fetch(
        `${BASE_URL}/api/sync-profile/${userr}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }
      );
      if (!res.ok) throw new Error("Failed to sync profile.");
      const data = await res.json();

      setProblemSet(data.user.dailyProblems.items);
      setStreak(data.user.streak);
      //   console.log(data.heatmap.values);
      setHeatmapData(data.heatmap);
    } catch (error) {
      console.error("Error during profile sync:", error);
    } finally {
      setIsSyncing(false);
    }
  }

  useEffect(() => {
    if (userr !== "guest") {
      fetchAllData(userr);
      navigate("/");
    }
  }, [userr]);

  if (loader) return <CptrainerLoader word={word} />;

  return (
    <MainAppContext.Provider
      value={{
        problemSet,
        ratingData,
        heatmapData,
        userr,
        handleSync,
        isSyncing,
      }}
    >
      <Nav />
      <Routes>
        <Route
          path="/"
          element={
            <Layout>
              <Dashboard />
            </Layout>
          }
        />
        <Route
          path="/contests"
          element={
            <Layout>
              <Contests />
            </Layout>
          }
        />
        <Route
          path="/analytics"
          element={
            <Layout>
              <Analytics />
            </Layout>
          }
        />
        <Route
          path="/blogs"
          element={
            <Layout>
              <Blogs />
            </Layout>
          }
        />
      </Routes>
    </MainAppContext.Provider>
  );
}
