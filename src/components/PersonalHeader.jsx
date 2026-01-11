// src/components/PersonalHeader.jsx
import React from "react";
import calendarIcon from "../assets/calendar.png";
import settingIcon from "../assets/navvar/button_setting.png";

export default function PersonalHeader({ icon, title }) {
  const defaultIcon = icon || calendarIcon;
  const defaultTitle = title || "개인 플랜";

  return (
    <div className="home-header plan-header">
      <img
        src={defaultIcon}
        alt="헤더 아이콘"
        className="plan-header-icon"
      />
      <span className="plan-header-title">{defaultTitle}</span>
    </div>
  );
}
