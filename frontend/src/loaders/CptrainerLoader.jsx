import React from "react";
import "../styles/CptrainerLoader.css";

export default function CptrainerLoader({ word = "CPTRAINER", className = "" }) {
  const letters = Array.from(word.toUpperCase());

  return (
    <main
      role="status"
      aria-live="polite"
      aria-label={`Loading ${word.toUpperCase()}`}
      className={`cptrainer-root ${className}`}
    >
      <div className="cptrainer-letters">
        {letters.map((ch, idx) => (
          <span
            key={`${ch}-${idx}`}
            className="cptrainer-letter"
            style={{ animationDelay: `${idx * 120}ms` }}
            aria-hidden="true"
          >
            {ch}
          </span>
        ))}
      </div>

      <div className="cptrainer-bar-outer" aria-hidden="true">
        <div className="cptrainer-bar-inner" />
      </div>

      <p className="sr-only">Loading, please wait…</p>
    </main>
  );
}
