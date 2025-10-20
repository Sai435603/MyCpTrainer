import ProblemSet from "./Problemset.jsx";
import Rating from "./Rating.jsx";
import Heatmap from "./Heatmap.jsx";
import "../styles/Dashboard.css";

export default function Dashboard() {
  return (
    <div className="dashboard-container">
      <div className="problems">
        <ProblemSet />
      </div>
      <div className="sub-container">
        <Rating />
        <Heatmap />
      </div>
    </div>
  );
}
