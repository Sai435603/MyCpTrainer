import { useContext, useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import LoginContext from "../contexts/LoginContext.jsx";
import MainAppContext from "../contexts/MainAppContext.jsx";
import CptrainerLoader from "../loaders/CptrainerLoader.jsx";
import Nav from "./Nav.jsx";

//main pages
import Dashboard from "./Dashboard.jsx";
import Contests from "./Contests.jsx";
import Analytics from "./Analytics.jsx";
import Blogs from "./Blogs.jsx";

//layout
import Layout from "./Layout.jsx";

export default function MainApp() {
  const { user } = useContext(LoginContext);
  const userr = user || "guest";

  const [loader, setLoader] = useState(true);
  const [word, setWord] = useState("Loading your problemset...");
  const [problemSet, setProblemSet] = useState([]);
  const [ratingData, setRatingData] = useState([]);
  const [heatmapData, setHeatmapData] = useState([]);

  async function fetchAllData(user) {
    try {
      const [problemsRes, ratingRes, heatmapRes] = await Promise.all([
        fetch(`http://localhost:3000/api/problems/${user}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }),
        fetch(`http://localhost:3000/api/rating/${user}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }),
        fetch(`http://localhost:3000/api/heatmap/${user}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }),
      ]);

      const [problems, rating, heatmap] = await Promise.all([
        problemsRes.json(),
        ratingRes.json(),
        heatmapRes.json(),
      ]);
      // console.log(problems, rating, heatmap);
      setProblemSet(problems);
      setRatingData(rating);
      setHeatmapData(heatmap);
      setLoader(false);
    } catch (error) {
      console.error("Error fetching data:", error);
      setWord("Failed to load your data.");
    }
  }

  useEffect(() => {
    fetchAllData(userr);
  }, [userr]);

  if (loader) return <CptrainerLoader word={word} />;

  return (
    <MainAppContext.Provider
      value={{ problemSet, ratingData, heatmapData, userr }}
    >
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
