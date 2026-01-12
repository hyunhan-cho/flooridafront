// src/pages/Home.jsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import ElevatorDoor from "../components/ElevatorDoor.jsx";
import FloorBackground from "../components/FloorBackground.jsx";
import TaskListSection from "../components/TaskListSection.jsx";
import QuestList from "../components/QuestList.jsx";
import Navbar from "../components/Navbar.jsx";
import WeeklyAchievementModal from "../components/WeeklyAchievementModal.jsx";

// ✅ 팝업(이식)
import CoinPopup from "../components/CoinPopup.jsx";
import BadgePopup from "../components/BadgePopup.jsx";

import {
  getCalendarStats,
  getSchedule,
  updateFloorCompletion,
  deleteSchedule,
  getFloorsStatusByDate,
  getTodayFloors,
  getMyProfile,
  getMissedPersonalPlace,
  completeFloor,
  uncompleteFloor,
  // ✅❌ 제거: getMyEquippedItems,
  // ✅❌ 제거: getMyEquippedBadges,
  // ✅ 캐릭터 베이스 이미지(아이템/뱃지 장착 로직 제거 후 대체)
  getMyCharacter,
  // ✅ 뱃지 팝업 조회용
  http,
} from "../services/api.js";

import { AUTH_TOKEN_KEY } from "../config.js";

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

  const [isOpen, setIsOpen] = useState(true);
  const [isMoving, setIsMoving] = useState(false);
  const [currentFloor, setCurrentFloor] = useState(1);
  const [direction, setDirection] = useState("up");

  // ✅❌ 제거: 아이템/뱃지 장착 상태
  // const [equippedItems, setEquippedItems] = useState([]);
  // const [equippedBadges, setEquippedBadges] = useState([]);

  // ✅ 대체: 캐릭터 베이스 이미지
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

  // ✅ 주간 모달: 팝업 큐 끝난 뒤에만
  const [showWeeklyModal, setShowWeeklyModal] = useState(false);

  const [tasks, setTasks] = useState([]);
  const [undoneTasks, setUndoneTasks] = useState([]); // 미달성 퀘스트
  const [showUndoneQuests, setShowUndoneQuests] = useState(false); // 미달성 퀘스트 토글
  const [loading, setLoading] = useState(false);

  const [personalLevel, setPersonalLevel] = useState(1); // 현재 층수
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

  // =========================
  // ✅✅✅ (이식) 뱃지 팝업 데이터
  // =========================
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

  // ✅✅✅ Home 진입 시 팝업 큐 구성 (50 → 10 → 뱃지(들))
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
      // swagger 정책상 "첫 로그인 날도 출석 10코인"이 같이 지급될 수 있음 → 방어
      if (dailyRewardGiven || firstLoginBonusGiven) {
        q.push({ type: "coin", coinAmount: 10 });
      }

      // 3) 오늘 획득 뱃지(들) — 출석 보상 받은 날만 의미있어 체크
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

      // ✅ 주간모달은 "기존 유저(온보딩 완료)"만, 그리고 큐 끝난 뒤에만 띄우기 위해 pending만 저장
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

  // =========================
  // ✅ 오늘 날짜의 진행도 로드
  // =========================
  useEffect(() => {
    const loadTodayProgress = async () => {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      if (!token) {
        return;
      }

      try {
        const todayFloors = await getTodayFloors();

        if (Array.isArray(todayFloors)) {
          const total = todayFloors.length;

          let todayFloorsStatus = null;
          try {
            const statusDate = getStatusDateFromFloors(todayFloors);
            todayFloorsStatus = await getFloorsStatusByDate(statusDate);
          } catch (error) {}

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
                } catch (err) {}
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
        }
      } catch (error) {
        if (error.status === 403) {
          return;
        }
      }
    };
    loadTodayProgress();
  }, []);

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

  // ✅✅✅ (정리) 캐릭터 베이스 이미지 로드만 유지 (아이템/뱃지 장착 API 제거)
  useEffect(() => {
    const loadCharacter = async () => {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      if (!token) return;

      try {
        const data = await getMyCharacter();
        const url = data?.imageUrl ?? data?.imgUrl ?? null;
        if (url) setCharacterImageUrl(url);
      } catch (error) {
        if (error?.status === 403) return;
      }
    };
    loadCharacter();
  }, []);

  // 사용자 프로필에서 층수 로드
  useEffect(() => {
    const loadProfile = async () => {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      if (!token) {
        return;
      }

      try {
        const profile = await getMyProfile();
        if (profile && profile.personalLevel !== undefined) {
          setPersonalLevel(profile.personalLevel);
        }
      } catch (error) {}
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

  // =========================
  // 오늘 날짜의 작업 목록 불러오기
  // =========================
  const loadTasks = async () => {
    const today = new Date();
    const todayStr = formatDate(today);
    const token = localStorage.getItem(AUTH_TOKEN_KEY);

    setLoading(true);

    if (!token) {
      setTasks([]);
      setUndoneTasks([]);
      setLoading(false);
      return;
    }

    try {
      const todayFloors = await getTodayFloors();

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
        } catch (error) {}

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
                progress: `${subtasks.filter((s) => s.done).length}/${
                  subtasks.length
                }`,
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
              } catch (err) {}
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
        } catch (error) {}
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
  // 이하 토글 로직(원본 그대로)
  // =========================
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
      } catch (statusError) {}

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
        } catch (scheduleError) {}
      }

      if (!serverCompleted && subtask.done === true) {
        serverCompleted = true;
      }
    } catch (error) {
      serverCompleted = subtask.done;
    }

    if (serverCompleted === true) {
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
            const done = updatedStatus.filter((f) =>
              isFloorCompleted(f)
            ).length;
            const percent = total > 0 ? Math.round((done / total) * 100) : 0;

            setTodayProgress({
              done,
              total,
              percent,
            });
          }
        } catch (progressError) {
          const updatedTodayFloors = await getTodayFloors();
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
        const updatedTodayFloors = await getTodayFloors();
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
          const updatedTodayFloors = await getTodayFloors();
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
        const updatedTodayFloors = await getTodayFloors();
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
    </div>
  );
}
