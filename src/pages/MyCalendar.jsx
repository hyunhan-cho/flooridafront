import React from "react";
import Navbar from "../components/Navbar.jsx";
import PersonalHeader from "../components/PersonalHeader.jsx";

export default function MyCalendar() {
  return (
    <div className="app home-view">
      {/* 상단 헤더 (홈이랑 같은 높이/폭) */}
      <PersonalHeader />

      {/* 본문 */}
      <main
        className="page-content"
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "center",
          marginTop: "15px",
          marginBottom: "15px",
        }}
      >
        {/* 안쪽 큰 흰 박스: 기존 card 사용 + 스타일 덮어쓰기 */}
        <div
          className="card"
          style={{
            background: "#ffffff",
            borderRadius: "28px",
            minHeight: "870px", // 필요하면 높이 조절
            boxShadow: "0 20px 40px rgba(0,0,0,0.35)",
            margin: 0,
          }}
        ></div>
      </main>

      <Navbar />
    </div>
  );
}
