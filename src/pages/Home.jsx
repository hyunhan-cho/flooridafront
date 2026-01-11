import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import ElevatorDoor from "../components/ElevatorDoor.jsx";
import TopInfo from "../components/TopInfo.jsx";
import QuestList from "../components/QuestList.jsx";
import { floors } from "../constants/floors.js";
import BackButton from "../components/BackButton.jsx";
import Navbar from "../components/Navbar.jsx";
import MonthProjects from "../components/MonthProjects.jsx";
import WeeklyAchievementModal from "../components/WeeklyAchievementModal.jsx";
import CoinPopup from "../components/CoinPopup.jsx";
import BadgePopup from "../components/BadgePopup.jsx";

import { getMyCharacter, getCalendarStats, http } from "../services/api.js";
import { AUTH_TOKEN_KEY } from "../config.js";

import "../App.css";

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// ISO(Z 포함) → 로컬 YYYY-MM-DD (KST면 KST 기준)
function toYmdLocal(isoString) {
  const d = new Date(isoString);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const elevatorInsideImg = "/images/frame.png";

export default function Home() {
  const navigate = useNavigate();
  const location = useLocation();

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

  // ✅ 주간 모달은 팝업 큐 끝난 뒤에만 띄우기
  const [showWeeklyModal, setShowWeeklyModal] = useState(false);

  // ✅✅✅ 팝업 큐
  // item: { type: "coin"|"badge", coinAmount?, badge?, asOfDate?, seenKey? }
  const [popupQueue, setPopupQueue] = useState([]);
  const activePopup = popupQueue.length ? popupQueue[0] : null;

  // ✅ Home 진입 플래그(로그인에서 넘긴 state) — 새로고침 대비 sessionStorage fallback
  const [entryFlags] = useState(() => {
    let fromSession = {};
    try {
      const raw = sessionStorage.getItem("home_entry_flags");
      fromSession = raw ? JSON.parse(raw) : {};
    } catch {
      fromSession = {};
    }
    const fromNav = location.state || {};
    const merged = { ...fromSession, ...fromNav };
    sessionStorage.setItem("home_entry_flags", JSON.stringify(merged));
    return merged;
  });

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

  // ✅ 오늘 획득한 뱃지(earnedAt이 asOfDate인 것들) 조회
  const fetchTodayEarnedBadges = async () => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return { asOfDate: null, earnedBadges: [] };

    try {
      const summary = await http.get("/api/me/badges/summary");

      const asOfDate =
        summary?.asOfDate ??
        summary?.data?.asOfDate ??
        summary?.result?.asOfDate ??
        null;

      const badges =
        summary?.badges ??
        summary?.data?.badges ??
        summary?.result?.badges ??
        [];

      if (!asOfDate || !Array.isArray(badges)) {
        return { asOfDate, earnedBadges: [] };
      }

      // ✅ 타임존 안전: earnedAt을 로컬로 변환해서 asOfDate와 비교
      const earnedToday = badges.filter((b) => {
        const earnedAt = b?.earnedAt;
        if (!earnedAt) return false;
        return toYmdLocal(earnedAt) === asOfDate;
      });

      // ✅ 이미 본 뱃지는 제외(여러개 대응)
      const filtered = earnedToday.filter((b) => {
        const badgeId = b?.badgeId ?? b?.id ?? null;
        const badgeKey =
          badgeId != null
            ? String(badgeId)
            : `${b?.name ?? "badge"}:${b?.earnedAt ?? ""}`;
        const seenKey = `badge_popup_seen:${asOfDate}:${badgeKey}`;
        return localStorage.getItem(seenKey) !== "1";
      });

      return { asOfDate, earnedBadges: filtered };
    } catch {
      return { asOfDate: null, earnedBadges: [] };
    }
  };

  // ✅ 팝업 닫기(큐 pop) — 뱃지는 "닫을 때" seen 처리
  const closeActivePopup = () => {
    setPopupQueue((prev) => {
      if (!prev.length) return prev;
      const first = prev[0];

      if (first?.type === "badge" && first?.seenKey) {
        localStorage.setItem(first.seenKey, "1");
      }

      return prev.slice(1);
    });
  };

  // ✅✅✅ Home 진입 시 팝업 큐 구성
  useEffect(() => {
    const firstLoginBonusGiven = Boolean(
      entryFlags?.firstLoginBonusGiven || entryFlags?.isFirstLogin
    );
    const dailyRewardGiven = Boolean(entryFlags?.dailyRewardGiven);
    const needsOnboarding = Boolean(entryFlags?.needsOnboarding);

    (async () => {
      const q = [];

      // 1) 첫 로그인 50코인
      if (firstLoginBonusGiven) {
        q.push({ type: "coin", coinAmount: 50 });
      }

      // 2) 출석 10코인
      // swagger 정책상 "첫 로그인 날도 출석 10코인"이 같이 지급된다고 되어 있으니
      // firstLoginBonusGiven이면 dailyRewardGiven이 false여도 10코인 팝업은 띄우도록 방어
      if (dailyRewardGiven || firstLoginBonusGiven) {
        q.push({ type: "coin", coinAmount: 10 });
      }

      // 3) 오늘 획득 뱃지(1일/연속 n일/30일 등)
      // 출석 보상 받은 날만 의미있어서 (dailyRewardGiven || firstLoginBonusGiven)일 때만 체크
      if (dailyRewardGiven || firstLoginBonusGiven) {
        const { asOfDate, earnedBadges } = await fetchTodayEarnedBadges();
        if (asOfDate && earnedBadges.length > 0) {
          earnedBadges.forEach((badge) => {
            const badgeId = badge?.badgeId ?? badge?.id ?? null;
            const badgeKey =
              badgeId != null
                ? String(badgeId)
                : `${badge?.name ?? "badge"}:${badge?.earnedAt ?? ""}`;
            const seenKey = `badge_popup_seen:${asOfDate}:${badgeKey}`;
            q.push({ type: "badge", badge, asOfDate, seenKey });
          });
        }
      }

      setPopupQueue(q);

      // 주간모달은 기존 유저(온보딩 완료)만, 그리고 큐 끝난 뒤에만
      if (!firstLoginBonusGiven && !needsOnboarding) {
        sessionStorage.setItem("weekly_modal_pending", "1");
      } else {
        sessionStorage.removeItem("weekly_modal_pending");
      }
    })();
  }, [entryFlags]);

  // ✅ 큐 종료 후 후처리: 온보딩 이동 / 주간모달
  useEffect(() => {
    if (popupQueue.length !== 0) return;

    const needsOnboarding = Boolean(entryFlags?.needsOnboarding);

    // 1) 온보딩 필요면 팝업 끝난 뒤 성향조사로
    if (needsOnboarding) {
      // 홈 진입 플래그는 처리 끝났으니 정리
      sessionStorage.removeItem("home_entry_flags");
      sessionStorage.removeItem("weekly_modal_pending");
      navigate("/tendency");
      return;
    }

    // 2) 기존유저면 주간모달
    const pendingWeekly =
      sessionStorage.getItem("weekly_modal_pending") === "1";
    if (pendingWeekly) {
      setShowWeeklyModal(true);
      sessionStorage.removeItem("weekly_modal_pending");
    }

    // 홈 진입 플래그 정리
    sessionStorage.removeItem("home_entry_flags");
  }, [popupQueue.length]); // eslint-disable-line react-hooks/exhaustive-deps

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

      {/* ✅ 팝업 큐: 50 → 10 → 뱃지(들) 순서 보장 */}
      {activePopup?.type === "coin" && (
        <CoinPopup
          coinAmount={activePopup.coinAmount}
          onClose={closeActivePopup}
        />
      )}

      {activePopup?.type === "badge" && activePopup?.badge && (
        <BadgePopup badge={activePopup.badge} onClose={closeActivePopup} />
      )}

      {/* ✅ 큐 끝난 뒤에만 주간 모달 */}
      {popupQueue.length === 0 && showWeeklyModal && (
        <WeeklyAchievementModal onClose={() => setShowWeeklyModal(false)} />
      )}
    </div>
  );
}
