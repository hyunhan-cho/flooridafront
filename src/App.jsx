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
import JoinedTeamPlace from "./pages/JoinedTeamPlace.jsx";
import Customize from "./pages/Customize.jsx";
import TeamCalendar from "./pages/TeamCalendar.jsx";
import TeamPlaceHome from "./pages/TeamPlaceHome.jsx";
import RoomManagement from "./pages/RoomManagement.jsx";
import MemberRemoval from "./pages/MemberRemoval.jsx";
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
      <Route path="/joinedteamplace" element={<JoinedTeamPlace />} />
      <Route path="/customize" element={<Customize />} />
      <Route path="/teamcalendar" element={<TeamCalendar />} />
      <Route path="/teamplacehome" element={<TeamPlaceHome />} />
      <Route path="/roommanagement" element={<RoomManagement />} />
      <Route path="/memberremoval" element={<MemberRemoval />} />
    </Routes>
  );
}
