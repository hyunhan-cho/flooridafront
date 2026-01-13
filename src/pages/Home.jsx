// src/pages/Home.jsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import ElevatorDoor from "../components/ElevatorDoor.jsx";
import FloorBackground from "../components/FloorBackground.jsx";
import TaskListSection from "../components/TaskListSection.jsx";
import QuestList from "../components/QuestList.jsx";
import Navbar from "../components/Navbar.jsx";
import WeeklyAchievementModal from "../components/WeeklyAchievementModal.jsx";
import CharacterDisplay from "../components/CharacterDisplay.jsx";

// ✅ 팝업(이식)
import CoinPopup from "../components/CoinPopup.jsx";
import BadgePopup from "../components/BadgePopup.jsx";
import WarningModal from "../components/WarningModal.jsx";

// ✅ Zustand 전역 상태
import { useUserStore } from "../store/userStore.js";

import {
  getCalendarStats,
  getSchedule,
  updateFloorCompletion,
  deleteSchedule,
  getFloorsStatusByDate,
  getMyProfile,
  getMissedPersonalPlace,
  completeFloor,
  uncompleteFloor,
  getMyCharacter,
  http,
} from "../services/api.js";
import { getMyEquippedItems } from "../services/store.js";
import { getMyEquippedBadges } from "../services/badge.js";

import { AUTH_TOKEN_KEY, AUTH_USER_KEY } from "../config.js";

import "../App.css";
import floorBoardImg from "../assets/img/board 1.png";

// 날짜를 YYYY-MM-DD 형식으로 변환
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

const COMPLETED_TOKENS = new Set([
  "true",
  "1",
  "y",
  "yes",
  "done",
  "complete",
  "completed",
]);

function isCompletedValue(value) {
  if (value === true || value === 1) return true;
  if (typeof value === "string") {
    return COMPLETED_TOKENS.has(value.toLowerCase());
  }
  return false;
}

function isFloorCompleted(floor) {
  if (!floor) return false;
  const value =
    floor.completed ??
    floor.isCompleted ??
    floor.done ??
    floor.status ??
    floor.state;
  return isCompletedValue(value);
}

function getFloorIdValue(floor) {
  if (!floor) return null;
  return floor.floorId ?? floor.id ?? null;
}

function getStatusDateFromFloors(floors) {
  if (!Array.isArray(floors) || floors.length === 0) {
    return formatDate(new Date());
  }
  const firstDate = floors[0]?.scheduledDate;
  if (typeof firstDate === "string" && firstDate.length >= 10) {
    return firstDate.slice(0, 10);
  }
  return formatDate(new Date());
}

function getStatusDateForSubtask(subtask) {
  const raw = subtask?.scheduledDate;
  if (typeof raw === "string" && raw.length >= 10) {
    return raw.slice(0, 10);
  }
  return formatDate(new Date());
}

const elevatorInsideImg = "/images/frame.png";

export default function Home() {
  const navigate = useNavigate();
  const location = useLocation();

  // ✅✅✅ Zustand store에서 캐싱된 데이터 사용 (Hook 상단 이동)
  const {
    profile: cachedProfile,
    character: cachedCharacter,
    todayFloors: cachedTodayFloors,
    itemMetadata,
    fetchProfile,
    fetchCharacter,
    fetchTodayFloors,
    fetchItemMetadata,
  } = useUserStore();

  // ✅ 초기 레벨 설정 (배경 깜빡임 방지)
  const initialLevel = cachedProfile?.personalLevel ?? 1;

  const [isOpen, setIsOpen] = useState(true);
  const [isMoving, setIsMoving] = useState(false);
  const [currentFloor, setCurrentFloor] = useState(initialLevel);
  const [direction, setDirection] = useState("up");

  // ✅ 캐릭터 관련 상태
  const [characterImageUrl, setCharacterImageUrl] = useState(null);
  const [equippedItems, setEquippedItems] = useState([]);
  const [equippedBadges, setEquippedBadges] = useState([]);

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

  // ✅ 주간 모달: 팝업 큐 끝난 뒤에만
  const [showWeeklyModal, setShowWeeklyModal] = useState(false);

  const [personalLevel, setPersonalLevel] = useState(initialLevel); // 현재 층수
  const pendingFloorRef = useRef(null);
  const hasInitialFloorSyncRef = useRef(false);

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
    try {
      sessionStorage.setItem("home_entry_flags", JSON.stringify(merged));
    } catch {
      // ignore
    }
    return merged;
  });

  const goToFloor = (targetFloor) => {
    if (isMoving || !isOpen || currentFloor === targetFloor) {
      return;
    }
    pendingFloorRef.current = targetFloor;
    setDirection(targetFloor > currentFloor ? "up" : "down");
    setIsOpen(false);
    setTimeout(() => {
      setIsMoving(true);
    }, 1500);
    setTimeout(() => {
      setIsMoving(false);
      setCurrentFloor(targetFloor);
      setTimeout(() => {
        setIsOpen(true);
        pendingFloorRef.current = null;
      }, 500);
    }, 3500);
  };

  // ✅ sessionStorage에서 캐시된 데이터 복원 (페이지 이동 후 즉시 표시)
  const [tasks, setTasks] = useState(() => {
    try {
      const cached = sessionStorage.getItem("home_tasks_cache");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) { }
    return [];
  });
  const [undoneTasks, setUndoneTasks] = useState(() => {
    try {
      const cached = sessionStorage.getItem("home_undoneTasks_cache");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) { }
    return [];
  });
  const [showUndoneQuests, setShowUndoneQuests] = useState(false);

  // ✅ 캐시된 데이터가 있으면 로딩 false로 시작
  const [loading, setLoading] = useState(() => {
    try {
      const cached = sessionStorage.getItem("home_tasks_cache");
      if (cached) {
        const parsed = JSON.parse(cached);
        return !(Array.isArray(parsed) && parsed.length > 0);
      }
    } catch (e) { }
    return true;
  });

  // ✅ 완료 취소 경고 팝업 상태 { task, subtask }
  const [uncompleteWarning, setUncompleteWarning] = useState(null);

  // =========================
  // ✅✅✅ (이식) 뱃지 팝업 데이터
  // =========================
  const fetchTodayEarnedBadges = async () => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return { asOfDate: null, userKey: null, earnedBadges: [] };

    let userKey = null;
    try {
      const raw = localStorage.getItem(AUTH_USER_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      userKey =
        parsed?.userId ??
        parsed?.memberId ??
        parsed?.id ??
        parsed?.email ??
        parsed?.username ??
        parsed?.name ??
        null;
      if (userKey != null) userKey = String(userKey);
    } catch {
      userKey = null;
    }

    if (userKey == null) {
      const fromCache =
        cachedProfile?.userId ??
        cachedProfile?.memberId ??
        cachedProfile?.id ??
        cachedProfile?.email ??
        cachedProfile?.username ??
        cachedProfile?.name ??
        null;
      if (fromCache != null) userKey = String(fromCache);
    }

    if (userKey == null) {
      try {
        const profile = await fetchProfile();
        const fromProfile =
          profile?.userId ??
          profile?.memberId ??
          profile?.id ??
          profile?.email ??
          profile?.username ??
          profile?.name ??
          null;
        if (fromProfile != null) userKey = String(fromProfile);
      } catch {
        userKey = null;
      }
    }

    try {
      const summary = await http.get("/api/me/badges/summary");

      const now = new Date();

      const badges =
        summary?.badges ??
        summary?.data?.badges ??
        summary?.result?.badges ??
        [];

      console.log("[Home DEBUG] badges fetched:", badges.length, badges);

      if (!Array.isArray(badges)) {
        return { asOfDate: null, earnedBadges: [] };
      }

      // ✅ (수정) "오늘" 날짜 비교 대신 "최근 24시간 이내" 획득한 뱃지 필터링
      // 타임존 차이나 자정 경계 문제를 피하기 위함
      const earnedToday = badges.filter((b) => {
        const earnedAt = b?.earnedAt;
        if (!earnedAt) return false;

        const earnedTime = new Date(earnedAt).getTime();
        const nowTime = now.getTime();
        const diffHours = (nowTime - earnedTime) / (1000 * 60 * 60);

        // 미래 시간이 아니고, 24시간 이내
        const isRecent = diffHours >= -0.1 && diffHours < 24;
        console.log(`[Home DEBUG] badge ${b.name}, earnedAt: ${earnedAt}, diffHours: ${diffHours.toFixed(2)}, match: ${isRecent}`);
        return isRecent;
      });

      // ✅ 이미 본 뱃지는 제외 (키에 날짜 대신 뱃지 고유 ID 사용 권장하지만, 기존 포맷 유지 위해 로컬 날짜 사용)
      const localToday = toYmdLocal(now);
      const filtered = earnedToday.filter((b) => {
        const badgeId = b?.badgeId ?? b?.id ?? null;
        const badgeKey =
          badgeId != null
            ? String(badgeId)
            : `${b?.name ?? "badge"}:${b?.earnedAt ?? ""}`;

        // seenKey에 localToday를 쓰면 날짜 바뀌면 다시 뜰 수 있음 -> badge_popup_seen:BADGE_ID 로 변경 고려
        // 일단 기존 유지하되 날짜 의존성 줄임
        const seenKey = `badge_popup_seen:${userKey ?? "anon"}:${localToday}:${badgeKey}`;
        const seen = localStorage.getItem(seenKey) === "1";
        console.log(`[Home DEBUG] badge ${b.name} seen check: ${seenKey} -> ${seen}`);
        return !seen;
      });

      return { asOfDate: localToday, userKey, earnedBadges: filtered };
    } catch {
      return { asOfDate: null, userKey: null, earnedBadges: [] };
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

  // ✅ 팝업 체크 중인지 여부 (초기값 true -> 체크 완료 후 false)
  const [isCheckingPopups, setIsCheckingPopups] = useState(true);

  // ✅✅✅ Home 진입 시 팝업 큐 구성 (50 → 10 → 뱃지(들))
  // ✅✅✅ Home 진입 시 팝업 큐 구성 (50 → 10 → 뱃지(들))
  useEffect(() => {
    // 1️⃣ 대기 중이던 플래그 복원 (온보딩 마치고 돌아온 경우)
    let currentFlags = { ...entryFlags };
    let hasDeferredFlags = false;

    try {
      const deferred = sessionStorage.getItem("deferred_home_flags");
      if (deferred) {
        const parsed = JSON.parse(deferred);
        currentFlags = { ...parsed, ...currentFlags };
        hasDeferredFlags = true;
      }
    } catch (e) {
      console.error(e);
    }

    // 2️⃣ 온보딩 필요 여부 우선 확인 (단, 온보딩에서 돌아온 경우엔 재리다이렉트 방지)
    const needsOnboarding = Boolean(entryFlags?.needsOnboarding) && !hasDeferredFlags;

    if (needsOnboarding) {
      // 🚨 온보딩이 필요하면 팝업 띄우지 말고 정보 저장 후 이동
      // 온보딩 완료 후 돌아왔을 때 띄우기 위함
      sessionStorage.setItem("deferred_home_flags", JSON.stringify(entryFlags));
      // ✅ 온보딩 완료 후 /home 복귀 시 무한 리다이렉트 방지
      sessionStorage.removeItem("home_entry_flags");
      navigate("/tendency");
      return;
    }

    const firstLoginBonusGiven = Boolean(
      currentFlags?.firstLoginBonusGiven || currentFlags?.isFirstLogin
    );
    const dailyRewardGiven = Boolean(currentFlags?.dailyRewardGiven);

    // ✅ 온보딩 복귀 또는 로그인 보상 플래그가 있을 때만 팝업 처리
    // (일반적인 홈 재진입에서는 팝업 띄우지 않음)
    if (!hasDeferredFlags && !firstLoginBonusGiven && !dailyRewardGiven) {
      setIsCheckingPopups(false);
      return;
    }

    (async () => {
      const q = [];

      // 1) 첫 로그인 50코인
      if (firstLoginBonusGiven) {
        q.push({ type: "coin", coinAmount: 50 });
      }

      // 2) 출석 10코인
      if (dailyRewardGiven || firstLoginBonusGiven) {
        q.push({ type: "coin", coinAmount: 10 });
      }

      // 3) 오늘(최근 24시간) 획득 뱃지(들)
      const { asOfDate, userKey, earnedBadges } = await fetchTodayEarnedBadges();
      if (asOfDate && earnedBadges.length > 0) {
        earnedBadges.forEach((badge) => {
          const badgeId = badge?.badgeId ?? badge?.id ?? null;
          const badgeKey =
            badgeId != null
              ? String(badgeId)
              : `${badge?.name ?? "badge"}:${badge?.earnedAt ?? ""}`;
          const seenKey = `badge_popup_seen:${userKey ?? "anon"}:${asOfDate}:${badgeKey}`;
          q.push({ type: "badge", badge, asOfDate, seenKey });
        });
      }

      setPopupQueue(q);
      setIsCheckingPopups(false); // ✅ 체크 완료

      // ✅ 주간모달 처리
      const hasShownWeekly = sessionStorage.getItem("has_shown_weekly_modal") === "1";
      if (!firstLoginBonusGiven && !hasShownWeekly) {
        sessionStorage.setItem("weekly_modal_pending", "1");
      } else {
        sessionStorage.removeItem("weekly_modal_pending");
      }
    })();
  }, [entryFlags]);

  // ✅ 큐 종료 후 후처리: 온보딩 이동 / 주간모달
  // ✅ 큐 종료 후 후처리: 주간모달만 처리 (온보딩 이동은 위에서 처리함)
  useEffect(() => {
    // 팝업 체크 중이거나 큐에 내용이 있으면 대기
    if (isCheckingPopups || popupQueue.length !== 0) return;

    // 기존유저면 주간모달
    const pendingWeekly = sessionStorage.getItem("weekly_modal_pending") === "1";
    if (pendingWeekly) {
      setShowWeeklyModal(true);
      sessionStorage.setItem("has_shown_weekly_modal", "1"); // ✅ 봤음 처리
      sessionStorage.removeItem("weekly_modal_pending");
    }

    // 홈 진입 플래그 정리
    sessionStorage.removeItem("home_entry_flags");
    sessionStorage.removeItem("deferred_home_flags");
  }, [popupQueue.length, isCheckingPopups]);

  // =========================
  // ✅ 오늘 날짜의 진행도 로드
  // =========================
  // ✅ 오늘 날짜의 진행도 로드 (Store 연동)
  useEffect(() => {
    const loadTodayProgress = async () => {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      if (!token) return;

      let floors = cachedTodayFloors;

      // 캐시 없으면 fetch
      if (!floors) {
        floors = await fetchTodayFloors();
      }

      // 그래도 없으면 중단
      if (!Array.isArray(floors)) return;

      try {
        const total = floors.length;
        let todayFloorsStatus = null;
        try {
          // 진행 상태 확인용 추가 API 호출 (이건 가벼우니 유지하거나, 이것도 캐싱 고려 가능)
          const statusDate = getStatusDateFromFloors(floors);
          todayFloorsStatus = await getFloorsStatusByDate(statusDate);
        } catch (error) { }

        let done = 0;
        for (const floor of floors) {
          let isCompleted = false;

          if (todayFloorsStatus && Array.isArray(todayFloorsStatus)) {
            const statusFloor = todayFloorsStatus.find(
              (f) => getFloorIdValue(f) === floor.floorId
            );
            if (statusFloor) {
              isCompleted = isFloorCompleted(statusFloor);
            }
          }

          if (!isCompleted) {
            if (isFloorCompleted(floor)) {
              isCompleted = true;
            } else {
              // 개별 상세 조회는 비용이 크므로 최소화 필요
              try {
                const detail = await getSchedule(floor.scheduleId);
                const detailFloors = detail.floors || [];
                const detailFloor = detailFloors.find(
                  (f) => getFloorIdValue(f) === floor.floorId
                );
                if (detailFloor) {
                  isCompleted = isFloorCompleted(detailFloor);
                }
              } catch (err) { }
            }
          }
          if (isCompleted) done++;
        }
        const percent = total > 0 ? Math.round((done / total) * 100) : 0;

        setTodayProgress({
          percent,
          done,
          total,
        });
      } catch (error) {
        if (error.status === 403) return;
      }
    };
    loadTodayProgress();
  }, [cachedTodayFloors, fetchTodayFloors]); // ✅ Store 데이터가 바뀌면 재실행

  // 프로젝트 개수 변경 시 todayProgress의 total 업데이트
  useEffect(() => {
    if (projectCount > 0) {
      setTodayProgress((prev) => {
        const percent =
          projectCount > 0 ? Math.round((prev.done / projectCount) * 100) : 0;
        return {
          ...prev,
          total: projectCount,
          percent,
        };
      });
    }
  }, [projectCount]);

  // ✅ 캐릭터 기본 로드 (캐시 우선)
  useEffect(() => {
    if (cachedCharacter) {
      setCharacterImageUrl(cachedCharacter);
    } else {
      const loadBase = async () => {
        const url = await fetchCharacter();
        // fetchCharacter가 url 문자열을 반환한다고 가정 (userStore.js 참고)
        if (url) {
          const actualUrl =
            typeof url === "string" ? url : url.imageUrl || url.character;
          if (actualUrl) setCharacterImageUrl(actualUrl);
        }
      };
      loadBase();
    }
  }, [cachedCharacter, fetchCharacter]);

  // ✅ 장착 아이템/뱃지 별도 로드 (베이스 로드와 분리하여 영향 주지 않음)
  useEffect(() => {
    const loadEquipped = async () => {
      try {
        const [itemsResp, badgesResp] = await Promise.all([
          getMyEquippedItems().catch(() => []),
          getMyEquippedBadges().catch(() => []),
        ]);

        const items = Array.isArray(itemsResp)
          ? itemsResp
          : itemsResp?.data || itemsResp?.items || [];
        const badges = Array.isArray(badgesResp)
          ? badgesResp
          : badgesResp?.data || badgesResp?.badges || [];

        setEquippedItems(items);
        setEquippedBadges(badges);

        // 메타데이터도 로드 (좌표 보정용)
        fetchItemMetadata();
      } catch (e) {
        console.error("Home: 장착 정보 로드 실패", e);
      }
    };
    loadEquipped();
  }, []);

  // ✅ 메타데이터 적용된 아이템 리스트 생성
  const mergedItems = React.useMemo(() => {
    return equippedItems.map((item) => {
      // item.itemId 혹은 item.id로 매칭
      const id = item.itemId || item.id;
      const meta = itemMetadata?.[id] || {};
      // item 속성 우선, 없으면 meta 속성 (좌표 등) 사용
      // 특히 offsetX, offsetY가 중요
      return { ...meta, ...item };
    });
  }, [equippedItems, itemMetadata]);

  // ✅ 프로필 로드 (캐시 우선)
  useEffect(() => {
    const loadProfile = async () => {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      if (!token) return;

      // 캐시된 프로필이 있으면 즉시 사용
      if (cachedProfile?.personalLevel !== undefined) {
        setPersonalLevel(cachedProfile.personalLevel);
        return;
      }

      // 없으면 fetch (내부에서 캐싱됨)
      const profile = await fetchProfile();
      if (profile?.personalLevel !== undefined) {
        setPersonalLevel(profile.personalLevel);
      }
    };

    loadProfile();
  }, []);

  // personalLevel 변경은 UI만 동기화 (애니메이션은 완료/취소 시에만 실행)
  useEffect(() => {
    const desired = Math.max(1, Number(personalLevel) || 1);
    if (!hasInitialFloorSyncRef.current) {
      setCurrentFloor(desired);
      hasInitialFloorSyncRef.current = true;
      return;
    }
    if (pendingFloorRef.current === desired) {
      return;
    }
    if (desired !== currentFloor) {
      setCurrentFloor(desired);
    }
  }, [personalLevel]); // eslint-disable-line react-hooks/exhaustive-deps

  // progressInfo의 done 값이 변경될 때 todayProgress 업데이트
  useEffect(() => {
    if (projectCount > 0) {
      setTodayProgress((prev) => {
        const done = progressInfo.done || 0;
        const percent =
          projectCount > 0 ? Math.round((done / projectCount) * 100) : 0;
        return {
          ...prev,
          done,
          total: projectCount,
          percent,
        };
      });
    }
  }, [progressInfo.done, projectCount]);

  // ✅ tasks가 변경될 때마다 sessionStorage에 캐시 저장
  useEffect(() => {
    if (tasks.length > 0) {
      try {
        sessionStorage.setItem("home_tasks_cache", JSON.stringify(tasks));
      } catch (e) { }
    }
  }, [tasks]);

  // ✅ undoneTasks가 변경될 때마다 sessionStorage에 캐시 저장
  useEffect(() => {
    try {
      sessionStorage.setItem(
        "home_undoneTasks_cache",
        JSON.stringify(undoneTasks)
      );
    } catch (e) { }
  }, [undoneTasks]);

  // =========================
  // 오늘 날짜의 작업 목록 불러오기
  // =========================
  const loadTasks = async () => {
    const today = new Date();
    const todayStr = formatDate(today);
    const token = localStorage.getItem(AUTH_TOKEN_KEY);

    // ✅ 캐시된 데이터가 있으면 로딩 표시 생략 (깜빡임 방지)
    const hasCache = cachedTodayFloors && cachedTodayFloors.length > 0;
    if (!hasCache) {
      setLoading(true);
    }

    if (!token) {
      setTasks([]);
      setUndoneTasks([]);
      setLoading(false);
      return;
    }

    try {
      // Store 캐싱 사용 - 불필요한 API 재요청 방지
      const todayFloors = await fetchTodayFloors();

      if (Array.isArray(todayFloors) && todayFloors.length > 0) {
        const scheduleMap = new Map();

        todayFloors.forEach((floor) => {
          const scheduleId = floor.scheduleId;
          if (!scheduleMap.has(scheduleId)) {
            scheduleMap.set(scheduleId, {
              scheduleId,
              title: floor.scheduleTitle || "제목 없음",
              color: floor.scheduleColor || "#3a8284",
              floors: [],
            });
          }
          scheduleMap.get(scheduleId).floors.push(floor);
        });

        let todayFloorsStatus = null;
        try {
          const statusDate = getStatusDateFromFloors(todayFloors);
          todayFloorsStatus = await getFloorsStatusByDate(statusDate);
        } catch (error) { }

        const todayTasks = await Promise.all(
          Array.from(scheduleMap.values()).map(async (schedule) => {
            try {
              const detail = await getSchedule(schedule.scheduleId);
              const startDate = detail.startDate;

              const start = new Date(startDate);
              const target = new Date(todayStr);
              start.setHours(0, 0, 0, 0);
              target.setHours(0, 0, 0, 0);
              const daysDiff = Math.floor(
                (target - start) / (1000 * 60 * 60 * 24)
              );

              let todayFloorFromApi = null;
              let todayFloorFromDetail = null;

              if (schedule.floors.length > 0) {
                todayFloorFromApi = schedule.floors[0];
              }

              let completedStatus = false;
              const targetFloorId = getFloorIdValue(todayFloorFromApi);
              const targetScheduledDate =
                todayFloorFromApi?.scheduledDate ?? todayStr;

              if (targetFloorId && todayFloorsStatus) {
                const statusFloor = Array.isArray(todayFloorsStatus)
                  ? todayFloorsStatus.find(
                    (f) => getFloorIdValue(f) === targetFloorId
                  )
                  : null;
                if (statusFloor) {
                  completedStatus = isFloorCompleted(statusFloor);
                }
              }

              if (!completedStatus) {
                const detailFloors = detail.floors || [];
                todayFloorFromDetail =
                  detailFloors.find(
                    (f) => getFloorIdValue(f) === targetFloorId
                  ) ||
                  detailFloors[daysDiff] ||
                  detailFloors[0];

                if (todayFloorFromDetail) {
                  completedStatus = isFloorCompleted(todayFloorFromDetail);
                }
              }

              const subtasks = [
                {
                  id:
                    getFloorIdValue(todayFloorFromApi) ||
                    getFloorIdValue(todayFloorFromDetail) ||
                    `sub-${schedule.scheduleId}-0`,
                  floorId:
                    getFloorIdValue(todayFloorFromApi) ||
                    getFloorIdValue(todayFloorFromDetail),
                  scheduleId: schedule.scheduleId,
                  text:
                    todayFloorFromApi?.title ||
                    todayFloorFromApi?.floorTitle ||
                    todayFloorFromDetail?.title ||
                    `단계 1`,
                  done: completedStatus,
                  dayNumber: daysDiff + 1,
                  scheduledDate: targetScheduledDate,
                  isTeamPlan:
                    detail.teamId !== null && detail.teamId !== undefined,
                },
              ];

              return {
                id: schedule.scheduleId?.toString() || `task-${Date.now()}`,
                title: schedule.title,
                // ✅ 디자인 요구사항: "전체 할 일 중 몇 번째인지" (예: 7/10)
                progress: `${Math.min(
                  daysDiff + 1,
                  detail.floors?.length || 1
                )}/${detail.floors?.length || 1}`,
                subtasks,
                color: schedule.color,
                startDate: detail.startDate,
                endDate: detail.endDate,
              };
            } catch (err) {
              return null;
            }
          })
        );

        const validTodayTasks = todayTasks.filter((t) => t !== null);

        const sortedTasks = [...validTodayTasks].sort((a, b) => {
          const aAllDone =
            a.subtasks.length > 0 && a.subtasks.every((s) => s.done);
          const bAllDone =
            b.subtasks.length > 0 && b.subtasks.every((s) => s.done);
          if (aAllDone && !bAllDone) return 1;
          if (!aAllDone && bAllDone) return -1;
          return 0;
        });

        setTasks(sortedTasks);

        // 미달성 퀘스트 조회 (개인 플랜)
        try {
          const missedResponse = await getMissedPersonalPlace();
          const missedSchedules = Array.isArray(missedResponse)
            ? missedResponse
            : missedResponse
              ? [missedResponse]
              : [];
          const undoneQuestsList = missedSchedules.map(
            (schedule, scheduleIndex) => {
              const scheduleFloors = schedule.floors || [];
              const startDate = schedule.startDate
                ? new Date(schedule.startDate)
                : null;
              const undoneSubtasks = scheduleFloors.map((floor, index) => {
                const scheduledDate = floor.scheduledDate
                  ? new Date(floor.scheduledDate)
                  : null;
                let dayNumber = index + 1;
                if (startDate && scheduledDate) {
                  const start = new Date(startDate);
                  const target = new Date(scheduledDate);
                  start.setHours(0, 0, 0, 0);
                  target.setHours(0, 0, 0, 0);
                  const daysDiff = Math.floor(
                    (target - start) / (1000 * 60 * 60 * 24)
                  );
                  dayNumber = daysDiff + 1;
                }

                return {
                  id: floor.floorId || `sub-${schedule.scheduleId}-${index}`,
                  floorId: floor.floorId,
                  scheduleId: schedule.scheduleId,
                  text: floor.title || `단계 ${index + 1}`,
                  done: isFloorCompleted(floor),
                  dayNumber,
                  scheduledDate: floor.scheduledDate || null,
                };
              });

              const doneCount = undoneSubtasks.filter((s) => s.done).length;
              return {
                id:
                  schedule.scheduleId?.toString() ||
                  `task-${scheduleIndex}-${Date.now()}`,
                title: schedule.scheduleTitle || schedule.title || "제목 없음",
                progress: `${doneCount}/${undoneSubtasks.length}`,
                subtasks: undoneSubtasks,
                color: schedule.scheduleColor || schedule.color || "#3a8284",
              };
            }
          );
          setUndoneTasks(undoneQuestsList);
        } catch (missedError) {
          setUndoneTasks([]);
        }

        // 진행도 계산
        const total = todayFloors.length;
        let done = 0;

        for (const floor of todayFloors) {
          let isCompleted = false;

          if (todayFloorsStatus && Array.isArray(todayFloorsStatus)) {
            const statusFloor = todayFloorsStatus.find(
              (f) => getFloorIdValue(f) === floor.floorId
            );
            if (statusFloor) {
              isCompleted = isFloorCompleted(statusFloor);
            }
          }

          if (!isCompleted) {
            if (isFloorCompleted(floor)) {
              isCompleted = true;
            } else {
              try {
                const detail = await getSchedule(floor.scheduleId);
                const detailFloors = detail.floors || [];
                const detailFloor = detailFloors.find(
                  (f) => getFloorIdValue(f) === floor.floorId
                );
                if (detailFloor) {
                  isCompleted = isFloorCompleted(detailFloor);
                }
              } catch (err) { }
            }
          }
          if (isCompleted) done++;
        }

        const percent = total > 0 ? Math.round((done / total) * 100) : 0;

        setTodayProgress({
          done,
          total,
          percent,
        });

        // API에서 층수 가져오기
        try {
          const profile = await getMyProfile();
          if (profile && profile.personalLevel !== undefined) {
            setPersonalLevel(profile.personalLevel);
          }
        } catch (error) { }
      } else {
        setTasks([]);
        setUndoneTasks([]);
        setTodayProgress((prev) => ({
          ...prev,
          total: 0,
          done: 0,
          percent: 0,
        }));
      }
    } catch (error) {
      setTasks([]);
      setUndoneTasks([]);
      setTodayProgress((prev) => ({
        ...prev,
        total: 0,
        done: 0,
        percent: 0,
      }));
    } finally {
      setLoading(false);
    }
  };

  // 컴포넌트 마운트 시 작업 목록 불러오기
  useEffect(() => {
    loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 페이지가 다시 포커스될 때 서버 상태와 동기화
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        loadTasks();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 일정 삭제 핸들러
  const handleDeleteSchedule = async (scheduleId) => {
    if (
      !window.confirm(
        "정말로 이 일정을 삭제하시겠습니까? 삭제된 일정은 복구할 수 없습니다."
      )
    ) {
      return;
    }

    try {
      await deleteSchedule(scheduleId);
      alert("일정이 삭제되었습니다.");
      await loadTasks();
    } catch (error) {
      alert("일정 삭제에 실패했습니다. 다시 시도해주세요.");
    }
  };

  // =========================
  // 이하 토글 로직
  // =========================

  // ✅ 실제 취소 처리 (경고 팝업 확인 후 실행)
  const processUncomplete = async () => {
    if (!uncompleteWarning) return;
    const { task, subtask } = uncompleteWarning;

    try {
      const uncompleteResult = await uncompleteFloor(subtask.floorId);

      const newTasks = tasks.map((t) => {
        if (t.id !== task.id) return t;
        const updatedSubtasks = t.subtasks.map((s) =>
          s.id === subtask.id ? { ...s, done: false } : s
        );
        const doneCount = updatedSubtasks.filter((s) => s.done).length;
        return {
          ...t,
          subtasks: updatedSubtasks,
          progress: `${doneCount}/${updatedSubtasks.length}`,
        };
      });

      const sortedTasks = [...newTasks].sort((a, b) => {
        const aAllDone =
          a.subtasks.length > 0 && a.subtasks.every((s) => s.done);
        const bAllDone =
          b.subtasks.length > 0 && b.subtasks.every((s) => s.done);
        if (aAllDone && !bAllDone) return 1;
        if (!aAllDone && bAllDone) return -1;
        return 0;
      });

      setTasks(sortedTasks);

      const statusDate = getStatusDateForSubtask(subtask);
      try {
        const updatedStatus = await getFloorsStatusByDate(statusDate);
        if (Array.isArray(updatedStatus)) {
          const total = updatedStatus.length;
          const done = updatedStatus.filter((f) => isFloorCompleted(f)).length;
          const percent = total > 0 ? Math.round((done / total) * 100) : 0;

          setTodayProgress({
            done,
            total,
            percent,
          });
        }
      } catch (progressError) {
        const updatedTodayFloors = await fetchTodayFloors(true);
        if (Array.isArray(updatedTodayFloors)) {
          const total = updatedTodayFloors.length;
          let done = 0;
          for (const floor of updatedTodayFloors) {
            if (isFloorCompleted(floor)) done++;
          }
          const percent = total > 0 ? Math.round((done / total) * 100) : 0;
          setTodayProgress({ done, total, percent });
        }
      }

      const profile = await getMyProfile();
      const currentFloorBeforeUpdate = currentFloor;
      const apiLevel =
        profile?.personalLevel ?? uncompleteResult?.personalLevel;
      const normalizedApiLevel = Number(apiLevel);
      const fallbackLevel = Math.max(1, currentFloorBeforeUpdate - 1);
      const nextPersonalLevel =
        Number.isFinite(normalizedApiLevel) &&
          normalizedApiLevel !== currentFloorBeforeUpdate
          ? normalizedApiLevel
          : fallbackLevel;
      if (nextPersonalLevel !== undefined) {
        const desired = Math.max(1, nextPersonalLevel);
        if (desired !== currentFloor && !isMoving) {
          goToFloor(desired);
          setPersonalLevel(nextPersonalLevel);
        } else {
          setPersonalLevel(nextPersonalLevel);
        }
      }
    } catch (error) {
      if (error.status === 400) {
        await loadTasks();
      } else if (error.status === 403) {
        alert(
          "이 항목을 취소할 권한이 없습니다. 개인 플랜의 항목만 취소할 수 있습니다."
        );
        await loadTasks();
      } else {
        await loadTasks();
      }
    } finally {
      setUncompleteWarning(null);
    }
  };

  const handleSubtaskToggle = async (task, subtask, e) => {
    if (subtask.isTeamPlan) {
      e.preventDefault();
      alert("팀 플랜의 항목은 개인 플랜에서 완료할 수 없습니다.");
      return;
    }

    if (!subtask.floorId) {
      e.preventDefault();
      return;
    }

    e.preventDefault();

    let serverCompleted = false;
    try {
      const statusDate = getStatusDateForSubtask(subtask);

      try {
        const todayFloorsStatus = await getFloorsStatusByDate(statusDate);
        if (Array.isArray(todayFloorsStatus)) {
          const statusFloor = todayFloorsStatus.find(
            (f) => getFloorIdValue(f) === subtask.floorId
          );
          if (statusFloor) {
            serverCompleted = isFloorCompleted(statusFloor);
          }
        }
      } catch (statusError) { }

      if (!serverCompleted) {
        try {
          const detail = await getSchedule(subtask.scheduleId);
          const detailFloors = detail.floors || [];
          const detailFloor = detailFloors.find(
            (f) => getFloorIdValue(f) === subtask.floorId
          );
          if (detailFloor) {
            serverCompleted = isFloorCompleted(detailFloor);
          }
        } catch (scheduleError) { }
      }

      if (!serverCompleted && subtask.done === true) {
        serverCompleted = true;
      }
    } catch (error) {
      serverCompleted = subtask.done;
    }

    if (serverCompleted === true) {
      setUncompleteWarning({ task, subtask });
      return;
    }

    try {
      const completeResult = await completeFloor(subtask.floorId);
      const coinsAwarded = Number(
        completeResult?.coinsAwarded ?? completeResult?.coinAwarded ?? 0
      );

      if (Number.isFinite(coinsAwarded) && coinsAwarded > 0) {
        const completedAt =
          completeResult?.completedAt ?? new Date().toISOString();
        const seenKey = `coin_popup_seen:floor_complete:${subtask.floorId}:${completedAt}`;
        if (localStorage.getItem(seenKey) !== "1") {
          setPopupQueue((prev) => [
            ...prev,
            { type: "coin", coinAmount: coinsAwarded, seenKey },
          ]);
        }
      }
      const newTasks = tasks.map((t) => {
        if (t.id !== task.id) return t;
        const updatedSubtasks = t.subtasks.map((s) =>
          s.id === subtask.id ? { ...s, done: true } : s
        );
        const doneCount = updatedSubtasks.filter((s) => s.done).length;
        return {
          ...t,
          subtasks: updatedSubtasks,
          progress: `${doneCount}/${updatedSubtasks.length}`,
        };
      });

      const sortedTasks = [...newTasks].sort((a, b) => {
        const aAllDone =
          a.subtasks.length > 0 && a.subtasks.every((s) => s.done);
        const bAllDone =
          b.subtasks.length > 0 && b.subtasks.every((s) => s.done);
        if (aAllDone && !bAllDone) return 1;
        if (!aAllDone && bAllDone) return -1;
        return 0;
      });

      setTasks(sortedTasks);

      const statusDate = getStatusDateForSubtask(subtask);
      try {
        const updatedStatus = await getFloorsStatusByDate(statusDate);
        if (Array.isArray(updatedStatus)) {
          const total = updatedStatus.length;
          const done = updatedStatus.filter((f) => isFloorCompleted(f)).length;
          const percent = total > 0 ? Math.round((done / total) * 100) : 0;

          setTodayProgress({
            done,
            total,
            percent,
          });
        }
      } catch (progressError) {
        const updatedTodayFloors = await fetchTodayFloors(true);
        if (Array.isArray(updatedTodayFloors)) {
          const total = updatedTodayFloors.length;
          let done = 0;
          for (const floor of updatedTodayFloors) {
            if (isFloorCompleted(floor)) done++;
          }
          const percent = total > 0 ? Math.round((done / total) * 100) : 0;
          setTodayProgress({ done, total, percent });
        }
      }

      const profile = await getMyProfile();
      const currentFloorBeforeUpdate = currentFloor;
      const apiLevel = profile?.personalLevel ?? completeResult?.personalLevel;
      const normalizedApiLevel = Number(apiLevel);
      const fallbackLevel = Math.max(1, currentFloorBeforeUpdate + 1);
      const nextPersonalLevel =
        Number.isFinite(normalizedApiLevel) &&
          normalizedApiLevel !== currentFloorBeforeUpdate
          ? normalizedApiLevel
          : fallbackLevel;
      if (nextPersonalLevel !== undefined) {
        const desired = Math.max(1, nextPersonalLevel);
        if (desired > currentFloorBeforeUpdate && !isMoving && isOpen) {
          goToFloor(desired);
          setPersonalLevel(nextPersonalLevel);
        } else {
          setPersonalLevel(nextPersonalLevel);
        }
      }
    } catch (error) {
      if (error.status === 400) {
        await loadTasks();
        return;
      }
      if (error.status === 403) {
        alert(
          "이 항목을 완료할 권한이 없습니다. 개인 플랜의 항목만 완료할 수 있습니다."
        );
        await loadTasks();
        return;
      }
      await loadTasks();
    }
  };

  const handleUndoneSubtaskToggle = async (task, subtask, e) => {
    if (!subtask.floorId) {
      e.preventDefault();
      return;
    }

    e.preventDefault();

    const isCurrentlyDone = subtask.done === true;

    if (isCurrentlyDone) {
      try {
        const uncompleteResult = await uncompleteFloor(subtask.floorId);

        const updatedUndoneTasks = undoneTasks.map((t) => {
          if (t.id !== task.id) return t;
          const updatedSubtasks = t.subtasks.map((s) =>
            s.id === subtask.id ? { ...s, done: false } : s
          );
          const doneCount = updatedSubtasks.filter((s) => s.done).length;
          return {
            ...t,
            subtasks: updatedSubtasks,
            progress: `${doneCount}/${updatedSubtasks.length}`,
          };
        });
        setUndoneTasks(updatedUndoneTasks);

        const statusDate = getStatusDateForSubtask(subtask);
        try {
          const updatedStatus = await getFloorsStatusByDate(statusDate);
          if (Array.isArray(updatedStatus)) {
            const total = updatedStatus.length;
            const done = updatedStatus.filter((f) =>
              isFloorCompleted(f)
            ).length;
            const percent = total > 0 ? Math.round((done / total) * 100) : 0;
            setTodayProgress({ done, total, percent });
          }
        } catch (progressError) {
          const updatedTodayFloors = await fetchTodayFloors(true);
          if (Array.isArray(updatedTodayFloors)) {
            const total = updatedTodayFloors.length;
            let done = 0;
            for (const floor of updatedTodayFloors) {
              if (isFloorCompleted(floor)) done++;
            }
            const percent = total > 0 ? Math.round((done / total) * 100) : 0;
            setTodayProgress({ done, total, percent });
          }
        }

        const profile = await getMyProfile();
        const currentFloorBeforeUpdate = currentFloor;
        const apiLevel =
          profile?.personalLevel ?? uncompleteResult?.personalLevel;
        const normalizedApiLevel = Number(apiLevel);
        const fallbackLevel = Math.max(1, currentFloorBeforeUpdate - 1);
        const nextPersonalLevel =
          Number.isFinite(normalizedApiLevel) &&
            normalizedApiLevel !== currentFloorBeforeUpdate
            ? normalizedApiLevel
            : fallbackLevel;
        if (nextPersonalLevel !== undefined) {
          const desired = Math.max(1, nextPersonalLevel);
          if (desired !== currentFloor && !isMoving) {
            goToFloor(desired);
            setPersonalLevel(nextPersonalLevel);
          } else {
            setPersonalLevel(nextPersonalLevel);
          }
        }
      } catch (error) {
        if (error.status === 400) {
          await loadTasks();
          return;
        }
        if (error.status === 403) {
          alert(
            "이 항목을 취소할 권한이 없습니다. 개인 플랜의 항목만 취소할 수 있습니다."
          );
          await loadTasks();
          return;
        }
        await loadTasks();
      }
      return;
    }

    try {
      const completeResult = await completeFloor(subtask.floorId);

      const updatedUndoneTasks = undoneTasks.map((t) => {
        if (t.id !== task.id) return t;
        const updatedSubtasks = t.subtasks.map((s) =>
          s.id === subtask.id ? { ...s, done: true } : s
        );
        const doneCount = updatedSubtasks.filter((s) => s.done).length;
        return {
          ...t,
          subtasks: updatedSubtasks,
          progress: `${doneCount}/${updatedSubtasks.length}`,
        };
      });
      setUndoneTasks(updatedUndoneTasks);

      const statusDate = getStatusDateForSubtask(subtask);
      try {
        const updatedStatus = await getFloorsStatusByDate(statusDate);
        if (Array.isArray(updatedStatus)) {
          const total = updatedStatus.length;
          const done = updatedStatus.filter((f) => isFloorCompleted(f)).length;
          const percent = total > 0 ? Math.round((done / total) * 100) : 0;
          setTodayProgress({ done, total, percent });
        }
      } catch (progressError) {
        const updatedTodayFloors = await fetchTodayFloors(true);
        if (Array.isArray(updatedTodayFloors)) {
          const total = updatedTodayFloors.length;
          let done = 0;
          for (const floor of updatedTodayFloors) {
            if (isFloorCompleted(floor)) done++;
          }
          const percent = total > 0 ? Math.round((done / total) * 100) : 0;
          setTodayProgress({ done, total, percent });
        }
      }

      const profile = await getMyProfile();
      const currentFloorBeforeUpdate = currentFloor;
      const apiLevel = profile?.personalLevel ?? completeResult?.personalLevel;
      const normalizedApiLevel = Number(apiLevel);
      const fallbackLevel = Math.max(1, currentFloorBeforeUpdate + 1);
      const nextPersonalLevel =
        Number.isFinite(normalizedApiLevel) &&
          normalizedApiLevel !== currentFloorBeforeUpdate
          ? normalizedApiLevel
          : fallbackLevel;
      if (nextPersonalLevel !== undefined) {
        const desired = Math.max(1, nextPersonalLevel);
        if (desired > currentFloorBeforeUpdate && !isMoving && isOpen) {
          goToFloor(desired);
          setPersonalLevel(nextPersonalLevel);
        } else {
          setPersonalLevel(nextPersonalLevel);
        }
      }
    } catch (error) {
      if (error.status === 400) {
        await loadTasks();
        return;
      }
      if (error.status === 403) {
        alert(
          "이 항목을 완료할 권한이 없습니다. 개인 플랜의 항목만 완료할 수 있습니다."
        );
        await loadTasks();
        return;
      }
      await loadTasks();
    }
  };

  return (
    <div className="app home-view">
      <div className="home-header">
        <img className="home-logo" src="/images/logo.png" alt="FLOORIDA" />
      </div>

      <div className="elevator-wrapper">
        <div className={`elevator ${isMoving ? "elevator-moving" : ""}`}>
          <div className="floor-indicator-box">
            <img
              src={floorBoardImg}
              alt="층수 표시판"
              className="floor-indicator-bg"
            />
            <span className="floor-indicator-number">{personalLevel}</span>
          </div>

          <div className="floor-scene">
            <FloorBackground personalLevel={personalLevel} />
          </div>

          <div
            className="elevator-inside"
            style={{ backgroundImage: `url(${elevatorInsideImg})` }}
          >
            {/* ✅❌ 아이템/뱃지 장착 렌더 제거 → 캐릭터 베이스만 */}
            {/* 캐릭터 + 아이템 + 뱃지 표시 */}
            {characterImageUrl && (
              <CharacterDisplay
                base={characterImageUrl}
                items={mergedItems}
                badges={equippedBadges}
                className="elevator-character"
                style={{
                  position: "absolute",
                  bottom: "25px", // 발 위치 조정
                  left: "50%",
                  // 원본 크기(114x126) 유지하고 scale로만 확대해야 좌표가 맞음
                  width: "114px",
                  height: "126px",
                  transform: "translateX(-50%) scale(1.3)", // 1.3배 확대 (필요시 조정)
                  transformOrigin: "bottom center",
                  zIndex: 15,
                }}
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

      <TaskListSection
        loading={loading}
        tasks={tasks}
        undoneTasks={undoneTasks}
        showUndoneQuests={showUndoneQuests}
        onToggleUndoneQuests={() => setShowUndoneQuests((prev) => !prev)}
        onSubtaskToggle={handleSubtaskToggle}
        onUndoneSubtaskToggle={handleUndoneSubtaskToggle}
      />

      <Navbar
        onNavigate={(key) => {
          if (key === "home") navigate("/home");
        }}
      />

      {/* ✅✅✅ (이식) 팝업 큐: 50 → 10 → 뱃지(들) 순서 보장 */}
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

      {/* ✅ 완료 취소 경고 모달 (컴포넌트 사용) */}
      <WarningModal
        open={!!uncompleteWarning}
        title="경고"
        content={
          <>
            완료를 취소하시겠습니까?
            <br />
            <span
              style={{
                color: "#d32f2f",
                fontSize: "13px",
                marginTop: "4px",
                display: "block",
              }}
            >
              (취소 시 10 코인이 차감되며,
              <br />
              층수가 내려갈 수 있습니다.)
            </span>
          </>
        }
        onConfirm={processUncomplete}
        onClose={() => setUncompleteWarning(null)}
        confirmText="취소하기"
        cancelText="닫기"
      />
    </div>
  );
}
