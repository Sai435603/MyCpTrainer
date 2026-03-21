import "../styles/Problemset.css";
import { useContext, useMemo, useState } from "react";
import MainAppContext from "../contexts/MainAppContext";

function getDifficultyClass(p) {
  if (p.source === "leetcode") {
    const d = (p.difficulty || "").toLowerCase();
    if (d === "easy") return "easy";
    if (d === "medium") return "medium";
    if (d === "hard") return "hard";
    return "medium";
  }
  const r = p.rating;
  if (!r) return "";
  if (r <= 1000) return "warm-up";
  if (r <= 1300) return "easy";
  if (r <= 1600) return "medium";
  if (r <= 2000) return "hard";
  if (r <= 2400) return "expert";
  return "legendary";
}

function getDifficultyLabel(p) {
  if (p.source === "leetcode") return p.difficulty || "Medium";
  const r = p.rating;
  if (!r) return "";
  if (r <= 1000) return "Warm-up";
  if (r <= 1300) return "Easy";
  if (r <= 1600) return "Medium";
  if (r <= 2000) return "Hard";
  if (r <= 2400) return "Expert";
  return "Legendary";
}

function problemUrl(p) {
  if (p.source === "leetcode" && p.titleSlug) return `https://leetcode.com/problems/${p.titleSlug}/`;
  if (!p.contestId || !p.index) return "#";
  return `https://codeforces.com/contest/${p.contestId}/problem/${p.index}`;
}

export default function Problemset() {
  const { problemSet, profileData } = useContext(MainAppContext);
  const [openInfoIdx, setOpenInfoIdx] = useState(null);
  const [filter, setFilter] = useState("all");

  const cfLinked = profileData?.cfLinked !== false;
  const lcLinked = !!profileData?.lcLinked;

  const problems = useMemo(() => {
    if (!problemSet) return [];
    if (Array.isArray(problemSet)) return problemSet;
    if (Array.isArray(problemSet.problems)) return problemSet.problems;
    if (Array.isArray(problemSet.items)) return problemSet.items;
    return [];
  }, [problemSet]);

  const filtered = useMemo(() => {
    if (filter === "all") return problems;
    return problems.filter(p => (p.source || "codeforces") === filter);
  }, [problems, filter]);

  const solvedCount = useMemo(() => problems.filter(p => p.isSolved).length, [problems]);
  const progressPct = problems.length > 0 ? Math.round((solvedCount / problems.length) * 100) : 0;
  const cfCount = problems.filter(p => (p.source || "codeforces") === "codeforces").length;
  const lcCount = problems.filter(p => p.source === "leetcode").length;

  const showLinkPrompt = (filter === "codeforces" && !cfLinked) || (filter === "leetcode" && !lcLinked);

  return (
    <div className="problem-set">
      <div className="problemset-header">
        <h2>Challenge Box</h2>
      </div>

      {/* Toggle Filter */}
      <div className="toggle-row">
        <button
          className={`toggle-btn ${filter === "all" ? "active" : ""}`}
          onClick={() => setFilter("all")}
        >
          All ({problems.length})
        </button>
        <button
          className={`toggle-btn toggle-cf ${filter === "codeforces" ? "active" : ""} ${!cfLinked ? "disabled-tab" : ""}`}
          onClick={() => setFilter("codeforces")}
        >
          CF ({cfCount})
        </button>
        <button
          className={`toggle-btn toggle-lc ${filter === "leetcode" ? "active" : ""} ${!lcLinked ? "disabled-tab" : ""}`}
          onClick={() => setFilter("leetcode")}
        >
          LC ({lcCount})
        </button>
      </div>

      {problems.length > 0 && (
        <div className="progress-stats">
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
          <span className="progress-label">{solvedCount}/{problems.length} solved</span>
        </div>
      )}

      {/* Link Prompt */}
      {showLinkPrompt && (
        <div className="link-prompt">
          <span className="link-prompt-icon">🔗</span>
          <span>
            {filter === "leetcode"
              ? "Link your LeetCode profile to get LC problems"
              : "Link your Codeforces profile to get CF problems"}
          </span>
          <small>Go to Profile → Manage Profiles</small>
        </div>
      )}

      <ol className="problem-list" aria-live="polite">
        {!showLinkPrompt && filtered.map((p, i) => {
          const key = p.problemId ?? `${p.contestId}-${p.index}-${i}`;
          const isOpen = openInfoIdx === i;
          const rowClassName = `problem-row ${p.isSolved ? "solved" : ""}`;
          const diffClass = getDifficultyClass(p);
          const diffLabel = getDifficultyLabel(p);
          const source = p.source || "codeforces";

          return (
            <li key={key} className={rowClassName}>
              {/* Solved indicator */}
              {p.isSolved ? (
                <span className="solved-badge" title="Solved on platform">✓</span>
              ) : (
                <span className="unsolved-dot" title="Not solved yet" />
              )}

              <a
                href={problemUrl(p)}
                target="_blank"
                rel="noopener noreferrer"
                className="problem-link"
              >
                <span className="problem-title">{p.name}</span>
              </a>

              <div className="problem-badges">
                <span className={`badge badge-source ${source}`}>
                  {source === "leetcode" ? "LC" : "CF"}
                </span>
                {diffLabel && (
                  <span className={`badge badge-difficulty ${diffClass}`}>
                    {diffLabel}
                  </span>
                )}
              </div>

              <button
                className="info-btn"
                aria-expanded={isOpen}
                onClick={() => setOpenInfoIdx(isOpen ? null : i)}
              >
                {isOpen ? "Hide" : "Topics"}
              </button>

              {isOpen && (
                <div className="info-box">
                  <div className="info-row">
                    <strong>{source === "leetcode" ? "Difficulty:" : "Rating:"}</strong>
                    <span>{source === "leetcode" ? (p.difficulty || "N/A") : (p.rating ?? "N/A")}</span>
                  </div>
                  <div className="info-row tags-row">
                    <strong>Tags:</strong>
                    <div className="tags">
                      {p.tags?.length > 0
                        ? p.tags.map((t) => <span key={t} className="tag">{t}</span>)
                        : <span className="tag">none</span>
                      }
                    </div>
                  </div>
                </div>
              )}
            </li>
          );
        })}
        {!showLinkPrompt && filtered.length === 0 && problems.length > 0 && (
          <li className="empty">No {filter === "leetcode" ? "LeetCode" : "Codeforces"} problems today</li>
        )}
        {problems.length === 0 && !showLinkPrompt && (
          <li className="empty">Sync your profile to detect solved problems</li>
        )}
      </ol>

      {problems.length > 0 && (
        <p className="sync-hint">Solve problems on CF/LC, then click <strong>Sync Profile</strong> to auto-detect</p>
      )}
    </div>
  );
}
