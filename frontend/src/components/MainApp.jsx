import { useContext, useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";
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

  const [loader, setLoader] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true); 
  const [word, setWord] = useState("Loading your problemset...");
  const [problemSet, setProblemSet] = useState([]);
  const [ratingData, setRatingData] = useState([]);
  const [heatmapData, setHeatmapData] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    if (!token) return null;
    return { Authorization: `Bearer ${token}` };
  };

  
  async function fetchAllData(userHandle, { showLoader = true, signal } = {}) {
    if (showLoader) setLoader(true);

    const authHeaders = getAuthHeaders();
    if (!authHeaders) {
      console.error("No authentication token found. Cannot fetch data.");
      if (showLoader) setLoader(false);
      return;
    }

    try {
      const responses = await Promise.allSettled([
        fetch(`${BASE_URL}/api/problems/${userHandle}`, { headers: authHeaders, signal }),
        fetch(`${BASE_URL}/api/rating/${userHandle}`, { headers: authHeaders, signal }),
        fetch(`${BASE_URL}/api/heatmap/${userHandle}`, { headers: authHeaders, signal }),
        fetch(`${BASE_URL}/api/streak/${userHandle}`, { headers: authHeaders, signal }),
      ]);

      const getJson = async (result) => {
        if (result?.status === "fulfilled" && result.value?.ok) {
          return await result.value.json();
        }
        if (result?.status === "rejected") {
          
          console.error("Fetch failed:", result.reason);
        } else if (result?.value && !result.value.ok) {
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

      if (problems) setProblemSet(problems);
      if (rating) setRatingData(rating);
      if (streak) setStreak(streak?.streak ?? 0);
      if (heatmapResponse?.success) setHeatmapData(heatmapResponse.heatmap);
    } catch (error) {
      if (error?.name === "AbortError") {
        console.log("fetchAllData aborted");
      } else {
        console.error("A critical error occurred in fetchAllData:", error);
        setWord("Failed to load your data.");
      }
    } finally {
      if (showLoader) setLoader(false);
    }
  }

  async function handleSync() {
    setIsSyncing(true);

    const authHeaders = getAuthHeaders();
    if (!authHeaders) {
      console.error("No authentication token found. Cannot sync profile.");
      setIsSyncing(false);
      return;
    }

    try {
      const res = await fetch(`${BASE_URL}/api/sync-profile/${userr}`, {
        method: "GET",
        headers: authHeaders,
      });
      if (!res.ok) throw new Error("Failed to sync profile.");
      const data = await res.json();

      setProblemSet(data.user.dailyProblems.items);
      setStreak(data.user.streak);
      setHeatmapData(data.heatmap);
    } catch (error) {
      console.error("Error during profile sync:", error);
    } finally {
      setIsSyncing(false);
    }
  }

  useEffect(() => {
    // fetch on mount and when user changes — DO NOT depend on router navigation
    if (userr !== "guest") {
      const controller = new AbortController();

      // IIFE so we can await and then mark initialLoad false after first fetch
      (async () => {
        await fetchAllData(userr, { showLoader: initialLoad, signal: controller.signal });
        // After the first attempt, don't show the global loader on background refreshes
        if (initialLoad) setInitialLoad(false);
      })();

      return () => controller.abort();
    } else {
      // no logged-in user -> disable loader
      setLoader(false);
      if (initialLoad) setInitialLoad(false);
    }
    // only depend on userr (not navigation)
  }, [userr]); // eslint-disable-line react-hooks/exhaustive-deps

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
