// src/components/BackButton.jsx
import React from "react";
import { useNavigate } from "react-router-dom";

export default function BackButton({ onClick, fallback = "/" }) {
  const navigate = useNavigate();

  const handleClick = (e) => {
    // 부모에서 별도 onClick을 넘겨주면 그걸 우선 사용
    if (onClick) {
      onClick(e);
      return;
    }

    // 브라우저 히스토리가 있으면 한 칸 뒤로,
    // 없으면(앱 첫 진입 등) fallback 경로로
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(fallback);
    }
  };

  return (
    <button className="back-btn" aria-label="뒤로" onClick={handleClick}>
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M15 18L9 12L15 6"
          stroke="#ffffff"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M20 12H9"
          stroke="#ffffff"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}
