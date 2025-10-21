import React, { useContext, useMemo } from "react";
import CalendarHeatmap from "react-calendar-heatmap";
import { Tooltip as ReactTooltip } from "react-tooltip";
import "react-calendar-heatmap/dist/styles.css";
import "react-tooltip/dist/react-tooltip.css";
import "../styles/Heatmap.css";
import MainAppContext from "../contexts/MainAppContext.jsx";

export default function Heatmap() {
 
  const { heatmapData } = useContext(MainAppContext);

  const { startDate, endDate, values } = useMemo(() => {
   
    if (heatmapData?.startDate && heatmapData?.endDate && Array.isArray(heatmapData.values)) {
      return {
        startDate: new Date(heatmapData.startDate),
        endDate: new Date(heatmapData.endDate),
        values: heatmapData.values.map((v) => ({ date: v.date, count: v.count ?? 0 })),
      };
    }

   
    const end = new Date();
    const start = new Date(end);
    start.setFullYear(start.getFullYear() - 1);
    const days = [];
    const cur = new Date(start);
    while (cur <= end) {
      const iso = cur.toISOString().slice(0, 10);
      days.push({ date: iso, count: 0 });
      cur.setDate(cur.getDate() + 1);
    }
    return { startDate: start, endDate: end, values: days };
  }, [heatmapData]); 
  return (
    <div className="heatmap-wrapper">
      <h2 className="title"><strong>Streak Map</strong></h2>

      <CalendarHeatmap
        startDate={startDate}
        endDate={endDate}
        values={values}
        classForValue={(value) => {
          if (!value || value.count === 0) return "color-empty";
          if (value.count === 1) return "color-scale-4";
          if (value.count === 2) return "color-scale-3";
          if (value.count === 3) return "color-scale-2";
          return "color-scale-1";
        }}
        tooltipDataAttrs={(value) => {
          if (!value || !value.date) return null;
          const prettyDate = new Date(value.date).toLocaleDateString("en-IN", {
            year: "numeric",
            month: "short",
            day: "numeric",
          });
          return {
            "data-tooltip-id": "heatmap-tooltip",
            "data-tooltip-content": `${value.count} problems solved on ${prettyDate}`,
          };
        }}
        showWeekdayLabels
      />

      <ReactTooltip id="heatmap-tooltip" />
    </div>
  );
}