// src/components/teamBoard/BoardIcons.jsx
import React from "react";

export function HeartIcon({ filled = false, className = "" }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        d="M12 21s-7.2-4.7-9.7-9C.5 8.7 2.3 5.7 5.6 5.2c1.8-.3 3.6.5 4.7 2
           1.1-1.5 2.9-2.3 4.7-2 3.3.5 5.1 3.5 3.3 6.8-2.5 4.3-9.7 9-9.7 9z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CommentIcon({ className = "" }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        d="M20 15a4 4 0 0 1-4 4H8l-4 3V7a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
