// src/pages/TeamPlace.jsx
import React from "react";
import Navbar from "../components/Navbar.jsx";

export default function TeamPlace() {
  return (
    <div className="app home-view">
      <header className="page-header">
        <h1 className="page-title">팀플레이스</h1>
        <p className="page-subtitle">함께 공부하는 공간을 준비 중입니다.</p>
      </header>

      <main className="page-content">
        {/* TODO: 여기 팀플 기능 채우면 됨 */}
        <p>팀플레이스를 곧 여기에 넣을 예정이에요.</p>
      </main>

      <Navbar />
    </div>
  );
}
