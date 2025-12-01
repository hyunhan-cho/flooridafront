import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ElevatorDoor from "../components/ElevatorDoor.jsx";
import TopInfo from "../components/TopInfo.jsx";
import QuestList from "../components/QuestList.jsx";
import { floors } from "../constants/floors.js";
import BackButton from "../components/BackButton.jsx";
import Navbar from "../components/Navbar.jsx";
import MonthProjects from "../components/MonthProjects.jsx";
import WeeklyAchievementModal from "../components/WeeklyAchievementModal.jsx";
import { getMyCharacter, getCalendarStats } from "../services/api.js";
import { AUTH_TOKEN_KEY } from "../config.js";

import "../App.css";

// 날짜를 YYYY-MM-DD 형식으로 변환
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const elevatorInsideImg = "/images/frame.png";

export default function Home() {
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(true);
  const [isMoving, setIsMoving] = useState(false);
  const [currentFloor, setCurrentFloor] = useState(1);
  const [direction, setDirection] = useState("up");
  const [characterImageUrl, setCharacterImageUrl] = useState(null);
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
  const [showWeeklyModal, setShowWeeklyModal] = useState(false);

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

  // 새로고침 시 모달 표시
  useEffect(() => {
    setShowWeeklyModal(true);
  }, []);

  // 오늘 날짜의 진행도 로드
  useEffect(() => {
    const loadTodayProgress = async () => {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      if (!token) {
        return;
      }

      try {
        const today = new Date();
        const todayStr = formatDate(today);
        const data = await getCalendarStats(todayStr, todayStr);

        // API 응답에서 오늘 날짜 데이터 찾기
        if (Array.isArray(data) && data.length > 0) {
          const todayData =
            data.find((item) => item.date === todayStr) || data[0];

          if (todayData) {
            const done = todayData.completedCount || 0;
            // total은 프로젝트 개수로 설정 (projectCount가 있으면 사용, 없으면 API 값 사용)
            const total = projectCount > 0 ? projectCount : (todayData.totalCount || 0);
            const percent = total > 0 ? Math.round((done / total) * 100) : 0;

            setTodayProgress({
              percent,
              done,
              total,
            });
          }
        } else if (data && data.totalCount !== undefined) {
          // 단일 객체로 반환되는 경우
          const done = data.completedCount || 0;
          // total은 프로젝트 개수로 설정 (projectCount가 있으면 사용, 없으면 API 값 사용)
          const total = projectCount > 0 ? projectCount : (data.totalCount || 0);
          const percent = total > 0 ? Math.round((done / total) * 100) : 0;

          setTodayProgress({
            percent,
            done,
            total,
          });
        }
      } catch (error) {
        if (error.status === 403) {
          console.log("로그인하지 않았거나 권한이 없습니다.");
          return;
        }
        console.error("오늘의 진행도 로드 실패:", error);
      }
    };
    loadTodayProgress();
  }, [projectCount]);

  // 프로젝트 개수 변경 시 todayProgress의 total 업데이트
  useEffect(() => {
    if (projectCount > 0) {
      setTodayProgress((prev) => {
        const percent = projectCount > 0 ? Math.round((prev.done / projectCount) * 100) : 0;
        return {
          ...prev,
          total: projectCount,
          percent,
        };
      });
    }
  }, [projectCount]);

  // 캐릭터 이미지 로드
  useEffect(() => {
    const loadCharacter = async () => {
      // 토큰이 있을 때만 API 호출
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      if (!token) {
        return; // 로그인하지 않은 경우 조용히 반환
      }

      try {
        const data = await getMyCharacter();
        console.log("캐릭터 API 응답:", data);
        if (data && data.imageUrl) {
          console.log("캐릭터 이미지 URL 설정:", data.imageUrl);
          setCharacterImageUrl(data.imageUrl);
        } else {
          console.warn("캐릭터 데이터에 imageUrl이 없습니다:", data);
        }
      } catch (error) {
        // 403 Forbidden은 로그인하지 않았거나 권한이 없는 경우이므로 조용히 처리
        if (error.status === 403) {
          console.log("로그인하지 않았거나 권한이 없습니다.");
          return;
        }
        // 다른 오류는 콘솔에 기록
        console.error("캐릭터 로드 실패:", error);
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

  // progressInfo의 done 값이 변경될 때 todayProgress 업데이트
  useEffect(() => {
    if (projectCount > 0) {
      setTodayProgress((prev) => {
        const done = progressInfo.done || 0;
        const percent = projectCount > 0 ? Math.round((done / projectCount) * 100) : 0;
        return {
          ...prev,
          done,
          total: projectCount,
          percent,
        };
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
                onLoad={() => console.log("캐릭터 이미지 로드 성공")}
                onError={(e) => console.error("캐릭터 이미지 로드 실패:", e)}
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
          // 다른 탭 있으면 여기도 라우팅
        }}
      />

      {showWeeklyModal && (
        <WeeklyAchievementModal onClose={() => setShowWeeklyModal(false)} />
      )}
    </div>
  );
}
