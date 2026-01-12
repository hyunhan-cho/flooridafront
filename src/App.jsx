// src/App.jsx
import React, { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import "./App.css";

// ✅ Zustand store for prefetching
import { useUserStore } from "./store/userStore.js";
import { AUTH_TOKEN_KEY } from "./config.js";

import Splash from "./pages/Splash.jsx";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import Home from "./pages/Home.jsx";
import TendencyInfo from "./pages/TendencyInfo.jsx";
import Mypage from "./pages/Mypage.jsx";
import MyCalendar from "./pages/MyCalendar.jsx";

import JoinedTeamPlace from "./pages/JoinedTeamPlace.jsx";
import TeamCreate from "./pages/TeamCreate.jsx";
import TeamJoin from "./pages/TeamJoin.jsx";

import Customize from "./pages/Customize.jsx";
import ProfileManage from "./pages/ProfileManage.jsx";
import TendencyEdit from "./pages/TendencyEdit.jsx";
import Withdraw from "./pages/Withdraw.jsx";
import BadgeList from "./pages/BadgeList.jsx";

import TeamCalendar from "./pages/TeamCalendar.jsx";
import TeamPlaceHome from "./pages/TeamPlaceHome.jsx";
import RoomManagement from "./pages/RoomManagement.jsx";
import MemberRemoval from "./pages/MemberRemoval.jsx";
import RoomRemoval from "./pages/RoomRemoval.jsx";
import SpecificTeamPlans from "./pages/SpecificTeamPlans.jsx";
import TeamBoardList from "./pages/TeamBoardList.jsx";
import TeamBoardDetail from "./pages/TeamBoardDetail.jsx";
import TeamBoardWrite from "./pages/TeamBoardWrite.jsx";

export default function App() {
  const { fetchProfile, fetchCharacter } = useUserStore();

  // ✅ 앱 시작 시 토큰이 있으면 데이터 미리 로드 (캐싱)
  useEffect(() => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
      // 병렬로 미리 로드 (캐시에 저장됨)
      Promise.all([fetchProfile(), fetchCharacter()]).catch(() => { });
    }
  }, [fetchProfile, fetchCharacter]);

  return (
    <Routes>
      <Route path="/" element={<Splash />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/home" element={<Home />} />
      <Route path="/tendency" element={<TendencyInfo />} />
      <Route path="/mypage" element={<Mypage />} />
      <Route path="/profile-manage" element={<ProfileManage />} />
      <Route path="/tendency-edit" element={<TendencyEdit />} />
      <Route path="/withdraw" element={<Withdraw />} />
      <Route path="/badges" element={<BadgeList />} />
      <Route path="/mycalendar" element={<MyCalendar />} />
      <Route path="/customize" element={<Customize />} />

      {/* ✅ TeamPlace 라우팅 */}
      <Route path="/teamplace" element={<JoinedTeamPlace />} />
      <Route path="/teamplace/create" element={<TeamCreate />} />
      <Route path="/teamplace/join" element={<TeamJoin />} />

      <Route path="/joinedteamplace" element={<JoinedTeamPlace />} />
      <Route path="/teamboard/:teamId" element={<TeamBoardList />} />
      <Route path="/teamboard/:teamId/write" element={<TeamBoardWrite />} />
      <Route path="/teamboard/:teamId/:boardId" element={<TeamBoardDetail />} />
      <Route path="/teamplacehome/:teamId" element={<TeamPlaceHome />} />
      <Route path="/roommanagement/:teamId" element={<RoomManagement />} />
      <Route path="/memberremoval/:teamId" element={<MemberRemoval />} />
      <Route path="/roomremoval/:teamId" element={<RoomRemoval />} />
      <Route path="/teamcalendar/:teamId" element={<TeamCalendar />} />
      <Route
        path="/specificteamplans/:teamId"
        element={<SpecificTeamPlans />}
      />
    </Routes>
  );
}

