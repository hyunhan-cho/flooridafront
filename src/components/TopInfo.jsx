import React from "react";

function formatShortDate(d = new Date()) {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const weekday = d
    .toLocaleDateString("en-US", { weekday: "short" })
    .toUpperCase();
  return `${mm}/${dd} (${weekday})`;
}

export default function TopInfo({ currentFloor, direction }) {
  const dirText = direction === "up" ? "상승" : "하강";
  return (
    <div className="top-info-card">
      <div className="info-date">{formatShortDate()}</div>
      <div className="info-lines">
        <div className="info-main">
          현재 층수는 <strong className="info-num">{currentFloor}</strong>{" "}
          층이다!
        </div>
        <div className="info-sub">{dirText} 중이다!</div>
      </div>
    </div>
  );
}
