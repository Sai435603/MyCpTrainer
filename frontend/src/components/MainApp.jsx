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
  const [profileData, setProfileData] = useState({ cfLinked: true, lcLinked: false, cfHandle: null, lcHandle: null });

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    if (!token) return null;
    return { Authorization: `Bearer ${token}` };
  };

  // Fetch profile data
  async function fetchProfile(signal) {
    const authHeaders = getAuthHeaders();
    if (!authHeaders) return;
    try {
      const res = await fetch(`${BASE_URL}/api/profile`, { headers: authHeaders, signal });
      if (res.ok) {
        const data = await res.json();
        setProfileData(data);
      }
    } catch (err) {
      if (err?.name !== "AbortError") console.error("fetchProfile error:", err);
    }
  }

  async function fetchAllData(userHandle, { showLoader = true, signal } = {}) {
    if (showLoader) setLoader(true);

    const authHeaders = getAuthHeaders();
    if (!authHeaders) {
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
        if (result?.status === "fulfilled" && result.value?.ok) return await result.value.json();
        return null;
      };

      const [problems, rating, heatmapResponse, streak] = await Promise.all([
        getJson(responses[0]),
        getJson(responses[1]),
        getJson(responses[2]),
        getJson(responses[3]),
      ]);

      if (problems) {
        setProblemSet(problems);
        // Update profile linked status from problems response
        if (typeof problems.cfLinked !== "undefined") {
          setProfileData(prev => ({
            ...prev,
            cfLinked: problems.cfLinked,
            lcLinked: problems.lcLinked,
          }));
        }
      }
      if (rating) setRatingData(rating);
      if (streak) setStreak(streak?.streak ?? 0);
      if (heatmapResponse?.success) setHeatmapData(heatmapResponse.heatmap);
    } catch (error) {
      if (error?.name !== "AbortError") {
        console.error("fetchAllData error:", error);
        setWord("Failed to load your data.");
      }
    } finally {
      if (showLoader) setLoader(false);
    }
  }

  async function handleSync() {
    setIsSyncing(true);
    const authHeaders = getAuthHeaders();
    if (!authHeaders) { setIsSyncing(false); return; }

    try {
      const res = await fetch(`${BASE_URL}/api/sync-profile/${userr}`, {
        method: "GET",
        headers: authHeaders,
      });
      if (!res.ok) throw new Error("Failed to sync profile.");
      await fetchAllData(userr, { showLoader: false });
    } catch (error) {
      console.error("Error during profile sync:", error);
    } finally {
      setIsSyncing(false);
    }
  }

  useEffect(() => {
    if (userr !== "guest") {
      const controller = new AbortController();
      (async () => {
        await Promise.all([
          fetchAllData(userr, { showLoader: initialLoad, signal: controller.signal }),
          fetchProfile(controller.signal),
        ]);
        if (initialLoad) setInitialLoad(false);
      })();
      return () => controller.abort();
    } else {
      setLoader(false);
      if (initialLoad) setInitialLoad(false);
    }
  }, [userr]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loader) return <CptrainerLoader word={word} />;

  return (
    <MainAppContext.Provider
      value={{
        problemSet, setProblemSet, ratingData, heatmapData, userr,
        handleSync, isSyncing,
        profileData, setProfileData,
      }}
    >
      <Nav />
      <Routes>
        <Route path="/" element={<Layout><Dashboard /></Layout>} />
        <Route path="/contests" element={<Layout><Contests /></Layout>} />
        <Route path="/analytics" element={<Layout><Analytics /></Layout>} />
        <Route path="/blogs" element={<Layout><Blogs /></Layout>} />
      </Routes>
    </MainAppContext.Provider>
  );
}
