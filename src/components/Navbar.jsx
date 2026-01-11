// src/components/Navbar.jsx
import React from "react";
import { useNavigate, useLocation } from "react-router-dom";

import teamIcon from "../assets/teamcalendar.png";
import calendarIcon from "../assets/mycalendar.png";
import homeIcon from "../assets/navvar/button_home.png";
import paintIcon from "../assets/navvar/button_paint.png";
import settingIcon from "../assets/navvar/button_setting.png";

const ITEMS = [
  {
    key: "team",
    label: "팀플레이스",
    icon: teamIcon,
    path: "/joinedteamplace",
  },
  {
    key: "calendar",
    label: "내캘린더",
    icon: calendarIcon,
    path: "/mycalendar",
  },
  { key: "home", label: "엘리베이터", icon: homeIcon, path: "/home" },
  { key: "paint", label: "꾸미기", icon: paintIcon, path: "/customize" },
  { key: "settings", label: "마이페이지", icon: settingIcon, path: "/mypage" },
];

export default function Navbar({ onNavigate }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleClick = (item) => {
    if (onNavigate) onNavigate(item.key);
    if (item.path) navigate(item.path);
  };

  const isActive = (item) => location.pathname.startsWith(item.path);

  return (
    <nav className="navbar">
      {ITEMS.map((it) => (
        <button
          key={it.key}
          className={`nav-item${isActive(it) ? " nav-item--active" : ""}`}
          onClick={() => handleClick(it)}
        >
          <img src={it.icon} alt="" className="nav-icon" />
          <span className="nav-label">{it.label}</span>
        </button>
      ))}
    </nav>
  );
}
