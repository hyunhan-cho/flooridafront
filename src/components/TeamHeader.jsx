import React from "react";
import calendarIcon from "../assets/calendar.png";

export default function TeamHeader() {
  return (
    <div className="home-header plan-header">
      <img
        src={calendarIcon}
        alt="캘린더 아이콘"
        className="plan-header-icon"
      />
      <span className="plan-header-title">팀 플랜</span>
    </div>
  );
}
