// pages/Mypage.jsx (AI 플래너 로직 제거 후 마이페이지 기본 템플릿만 남김)
import React from "react";
import Navbar from "../components/Navbar.jsx";
import PersonalHeader from "../components/PersonalHeader.jsx";

// 💡 AiPlan* 관련 import는 모두 제거합니다.

export default function Mypage() {
  return (
    <div className="app home-view">
      {/* 상단 헤더는 그대로 유지 */}
      <PersonalHeader />

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
        <div
          className="card"
          style={{
            background: "#ffffff",
            borderRadius: "28px",
            minHeight: "870px",
            boxShadow: "0 20px 40px rgba(0,0,0,0.35)",
            margin: 0,
            padding: "20px", // 마이페이지 기본 padding 설정 (AI 플래너와 다름)
            display: "flex",
            flexDirection: "column",
            alignItems: "center", // 중앙 정렬 예시
            justifyContent: "flex-start",
          }}
        >
          {/* 여기에 마이페이지/설정 관련 내용을 추가합니다. 
            현재는 Placeholder만 표시합니다.
          */}
          <h2 style={{ color: "#475569", marginTop: "50px" }}>
            마이페이지 기능을 준비 중입니다.
          </h2>
          <p style={{ color: "#64748b" }}>
            개인 정보 및 설정 관리를 위한 화면입니다.
          </p>
        </div>
      </main>

      <Navbar />
    </div>
  );
}
