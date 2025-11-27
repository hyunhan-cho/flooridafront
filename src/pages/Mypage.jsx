import React from "react";
import Navbar from "../components/Navbar.jsx";

export default function Mypage() {
  return (
    <div className="app home-view">
      <header className="page-header">
        <h1 className="page-title">마이페이지</h1>
      </header>

      <main className="page-content">
        <p>마이페이지~~</p>
      </main>

      <Navbar />
    </div>
  );
}
