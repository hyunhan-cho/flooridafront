// src/App.jsx
import React from "react";
import { Routes, Route } from "react-router-dom";
import "./App.css";
import Splash from "./pages/Splash.jsx";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import Home from "./pages/Home.jsx";
import TendencyInfo from "./pages/TendencyInfo.jsx";
import Mypage from "./pages/Mypage.jsx";
import MyCalendar from "./pages/MyCalendar.jsx";
import TeamPlace from "./pages/TeamPlace.jsx";
import Customize from "./pages/Customize.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Splash />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/home" element={<Home />} />
      <Route path="/tendency" element={<TendencyInfo />} />
      <Route path="/mypage" element={<Mypage />} />
      <Route path="/mycalendar" element={<MyCalendar />} />
      <Route path="/teamplace" element={<TeamPlace />} />
      <Route path="/customize" element={<Customize />} />
    </Routes>
  );
}
