import React from "react";
import "../styles/CptrainerLoader.css";

export default function CptrainerLoader({ word = "CP TRAINER" }) {
  return (
    <main role="status" aria-live="polite" className="loader-root">
      {/* Animated rings */}
      <div className="loader-rings">
        <div className="ring ring-1" />
        <div className="ring ring-2" />
        <div className="ring ring-3" />
        <div className="loader-core">
          <span className="loader-icon">⚡</span>
        </div>
      </div>

      <h1 className="loader-title">{word}</h1>
      <p className="loader-subtitle">Preparing your training session</p>

      {/* Dot pulse */}
      <div className="loader-dots">
        <span className="dot" />
        <span className="dot" />
        <span className="dot" />
      </div>
    </main>
  );
}
