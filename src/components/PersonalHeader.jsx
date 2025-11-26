// src/components/PersonalHeader.jsx
import React from "react";
import calendarIcon from "../assets/calendar.png";

export default function PersonalHeader() {
  return (
    <div className="home-header plan-header">
      <img
        src={calendarIcon}
        alt="캘린더 아이콘"
        className="plan-header-icon"
      />
      <span className="plan-header-title">개인 플랜</span>
    </div>
  );
}
