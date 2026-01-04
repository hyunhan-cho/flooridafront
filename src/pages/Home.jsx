import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom"; // useLocation 추가
import ElevatorDoor from "../components/ElevatorDoor.jsx";
import TopInfo from "../components/TopInfo.jsx";
import QuestList from "../components/QuestList.jsx";
import { floors } from "../constants/floors.js";
import BackButton from "../components/BackButton.jsx";
import Navbar from "../components/Navbar.jsx";
import MonthProjects from "../components/MonthProjects.jsx";
import WeeklyAchievementModal from "../components/WeeklyAchievementModal.jsx";
import CoinPopup from "../components/CoinPopup.jsx"; // [추가] 코인 팝업
import { getMyCharacter, getCalendarStats } from "../services/api.js";
import { AUTH_TOKEN_KEY } from "../config.js";

import "../App.css";

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const elevatorInsideImg = "/images/frame.png";

export default function Home() {
  const navigate = useNavigate();
  const location = useLocation(); // location 훅

  const [isOpen, setIsOpen] = useState(true);
  const [isMoving, setIsMoving] = useState(false);
  const [currentFloor, setCurrentFloor] = useState(1);
  const [direction, setDirection] = useState("up");
  const [characterImageUrl, setCharacterImageUrl] = useState(null);

  // 진행도 상태
  const [progressInfo, setProgressInfo] = useState({
    percent: 0,
    done: 0,
    total: 0,
  });
  const [todayProgress, setTodayProgress] = useState({
    percent: 0,
    done: 0,
    total: 0,
  });
  const [projectCount, setProjectCount] = useState(0);

  // 모달 상태
  const [showWeeklyModal, setShowWeeklyModal] = useState(false);
  const [showWelcomeCoin, setShowWelcomeCoin] = useState(false); // [추가] 50코인 팝업

  const goToFloor = (targetFloor) => {
    if (isMoving || !isOpen || currentFloor === targetFloor) return;
    setDirection(targetFloor > currentFloor ? "up" : "down");
    setIsOpen(false);
    setTimeout(() => setIsMoving(true), 1500);
    setTimeout(() => {
      setIsMoving(false);
      setCurrentFloor(targetFloor);
      setTimeout(() => setIsOpen(true), 500);
    }, 3500);
  };

  const floor = floors[currentFloor];

  // [핵심] 진입 경로(state)에 따라 모달 분기 처리
  useEffect(() => {
    // navigate를 통해 전달된 state 확인
    const isFirstLogin = location.state?.isFirstLogin;
    console.log("Home 진입 - isFirstLogin:", isFirstLogin);

    if (isFirstLogin) {
      // 신규 가입(성향조사 완료) 후 첫 진입 -> 50 코인 팝업
      setShowWelcomeCoin(true);
      setShowWeeklyModal(false);

      // 새로고침 시 팝업이 다시 뜨지 않도록 history state 초기화
      window.history.replaceState({}, document.title);
    } else {
      // 일반 진입(Login에서 옴) 또는 새로고침 -> 주간 달성률 팝업
      setShowWeeklyModal(true);
      setShowWelcomeCoin(false);
    }
  }, [location.state]);

  // 오늘 진행도 로드
  useEffect(() => {
    const loadTodayProgress = async () => {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      if (!token) return;

      try {
        const today = new Date();
        const todayStr = formatDate(today);
        const data = await getCalendarStats(todayStr, todayStr);

        if (Array.isArray(data) && data.length > 0) {
          const todayData =
            data.find((item) => item.date === todayStr) || data[0];
          if (todayData) {
            const done = todayData.completedCount || 0;
            const total =
              projectCount > 0 ? projectCount : todayData.totalCount || 0;
            const percent = total > 0 ? Math.round((done / total) * 100) : 0;
            setTodayProgress({ percent, done, total });
          }
        } else if (data && data.totalCount !== undefined) {
          const done = data.completedCount || 0;
          const total = projectCount > 0 ? projectCount : data.totalCount || 0;
          const percent = total > 0 ? Math.round((done / total) * 100) : 0;
          setTodayProgress({ percent, done, total });
        }
      } catch (error) {
        if (error.status !== 403)
          console.error("오늘의 진행도 로드 실패:", error);
      }
    };
    loadTodayProgress();
  }, [projectCount]);

  useEffect(() => {
    if (projectCount > 0) {
      setTodayProgress((prev) => {
        const percent =
          projectCount > 0 ? Math.round((prev.done / projectCount) * 100) : 0;
        return { ...prev, total: projectCount, percent };
      });
    }
  }, [projectCount]);

  // 캐릭터 이미지 로드
  useEffect(() => {
    const loadCharacter = async () => {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      if (!token) return;
      try {
        const data = await getMyCharacter();
        if (data && data.imageUrl) setCharacterImageUrl(data.imageUrl);
      } catch (error) {
        if (error.status !== 403) console.error("캐릭터 로드 실패:", error);
      }
    };
    loadCharacter();
  }, []);

  useEffect(() => {
    const maxFloor = Object.keys(floors).length;
    const desired = Math.max(
      1,
      Math.min(1 + (progressInfo?.done ?? 0), maxFloor)
    );
    if (desired !== currentFloor) {
      goToFloor(desired);
    }
  }, [progressInfo, currentFloor, isMoving, isOpen]);

  useEffect(() => {
    if (projectCount > 0) {
      setTodayProgress((prev) => {
        const done = progressInfo.done || 0;
        const percent =
          projectCount > 0 ? Math.round((done / projectCount) * 100) : 0;
        return { ...prev, done, total: projectCount, percent };
      });
    }
  }, [progressInfo.done, projectCount]);

  return (
    <div className="app home-view">
      <BackButton />

      <div className="home-header">
        <img className="home-logo" src="/images/logo.png" alt="FLOORIDA" />
      </div>

      <div className="elevator-wrapper">
        <div className={`elevator ${isMoving ? "elevator-moving" : ""}`}>
          <TopInfo currentFloor={currentFloor} direction={direction} />
          <div className="floor-scene" style={floor.sceneStyle}>
            <div className="cloud c1" />
            <div className="cloud c2" />
            <div className="cloud c3" />
          </div>
          <div
            className="elevator-inside"
            style={{ backgroundImage: `url(${elevatorInsideImg})` }}
          >
            {characterImageUrl && (
              <img
                src={characterImageUrl}
                alt="캐릭터"
                className="elevator-character"
              />
            )}
          </div>
          <ElevatorDoor isOpen={isOpen} />
        </div>
      </div>

      <QuestList
        progress={todayProgress.percent}
        done={todayProgress.done}
        total={todayProgress.total}
      />
      <MonthProjects
        onProgressChange={setProgressInfo}
        onProjectCountChange={setProjectCount}
      />

      <Navbar
        onNavigate={(key) => {
          if (key === "home") navigate("/home");
        }}
      />

      {/* 주간 달성률 모달 (기존 유저용) */}
      {showWeeklyModal && (
        <WeeklyAchievementModal onClose={() => setShowWeeklyModal(false)} />
      )}

      {/* [추가] 가입 축하 코인 팝업 (신규 유저용) */}
      {showWelcomeCoin && (
        <CoinPopup coinAmount={50} onClose={() => setShowWelcomeCoin(false)} />
      )}
    </div>
  );
}
