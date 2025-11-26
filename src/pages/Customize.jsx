// src/pages/Customize.jsx
import React from "react";
import Navbar from "../components/Navbar.jsx";

export default function Customize() {
  return (
    <div className="app home-view">
      <header className="page-header">
        <h1 className="page-title">꾸미기</h1>
        <p className="page-subtitle">엘리베이터와 마이페이지를 내 스타일로.</p>
      </header>

      <main className="page-content">
        {/* TODO: 테마/스킨 설정 UI 자리 */}
        <p>테마, 배경, 캐릭터를 커스텀하는 화면을 여기에 만들면 돼요.</p>
      </main>

      <Navbar />
    </div>
  );
}
