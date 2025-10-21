import "../styles/Problemset.css";
import { useContext, useMemo, useState } from "react";
import MainAppContext from "../contexts/MainAppContext";

export default function Problemset() {
  const { problemSet } = useContext(MainAppContext);
  const [openInfoIdx, setOpenInfoIdx] = useState(null);

  const problems = useMemo(() => {
    if (!problemSet) return [];
    if (Array.isArray(problemSet)) return problemSet;
    if (Array.isArray(problemSet.problems)) return problemSet.problems;
    if (Array.isArray(problemSet.items)) return problemSet.items;
    return [];
  }, [problemSet]);

  function cfUrl(problem) {
    if (!problem) return "#";
    const cid = problem.contestId;
    const idx = problem.index;
    if (!cid || !idx) return "#";
    return `https://codeforces.com/contest/${cid}/problem/${idx}`;
  }

  return (
    <div className="problem-set">
      <div className="problemset-header">
        <h2>Challenge Box</h2>
      </div>
      <ol className="problem-list" aria-live="polite">
        {problems.map((p, i) => {
          const key = p.problemId ?? `${p.contestId}-${p.index}-${i}`;
          const isOpen = openInfoIdx === i;

          // Conditionally add the 'solved' class
          const rowClassName = `problem-row ${p.isSolved ? "solved" : ""}`;

          return (
            <li key={key} className={rowClassName}>
              <a
                href={cfUrl(p)}
                target="_blank"
                rel="noopener noreferrer"
                className="problem-link"
                title={`${p.name} — ${p.rating ?? "—"} pts`}
              >
                <span className="problem-title">{p.name}</span>
              </a>

              <button
                className="info-btn"
                aria-expanded={isOpen}
                aria-controls={`info-box-${i}`}
                onClick={() => setOpenInfoIdx(isOpen ? null : i)}
              >
                {isOpen ? "Hide" : "Topics"}
              </button>

              {isOpen && (
                <div id={`info-box-${i}`} className="info-box">
                  <div className="info-row">
                    <strong>Rating:</strong>
                    <span>{p.rating ?? "N/A"}</span>
                  </div>
                  <div className="info-row tags-row">
                    <strong>Tags:</strong>
                    <div className="tags">
                      {p.tags && p.tags.length > 0 ? (
                        p.tags.map((t) => (
                          <span key={t} className="tag">
                            {t}
                          </span>
                        ))
                      ) : (
                        <span className="tag">none</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </li>
          );
        })}
        {problems.length === 0 && (
          <li className="empty">No problems available</li>
        )}
      </ol>
    </div>
  );
}
