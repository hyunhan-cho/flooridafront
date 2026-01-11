import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ElevatorDoor from "../components/ElevatorDoor.jsx";
import FloorBackground from "../components/FloorBackground.jsx";
import TaskListSection from "../components/TaskListSection.jsx";
import QuestList from "../components/QuestList.jsx";
import Navbar from "../components/Navbar.jsx";
import WeeklyAchievementModal from "../components/WeeklyAchievementModal.jsx";
import {
  getMyCharacter,
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
  addTestFloors,
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
  const [tasks, setTasks] = useState([]);
  const [undoneTasks, setUndoneTasks] = useState([]); // 미달성 퀘스트
  const [showUndoneQuests, setShowUndoneQuests] = useState(false); // 미달성 퀘스트 토글
  const [loading, setLoading] = useState(false);
  const [personalLevel, setPersonalLevel] = useState(1); // 현재 층수
  const pendingFloorRef = useRef(null);
  const hasInitialFloorSyncRef = useRef(false);

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
        // getTodayFloors()에서 진행도 계산
        const todayFloors = await getTodayFloors();

        if (Array.isArray(todayFloors)) {
          const total = todayFloors.length;

          // 오늘 날짜의 floor 상태 조회 (getFloorsStatusByDate 사용)
          let todayFloorsStatus = null;
          try {
            const todayStr = formatDate(new Date());
            todayFloorsStatus = await getFloorsStatusByDate(todayStr);
          } catch (error) {}

          // 각 floor의 completed 상태를 확인
          let done = 0;
          for (const floor of todayFloors) {
            let isCompleted = false;

            // getFloorsStatusByDate에서 우선 확인
            if (todayFloorsStatus && Array.isArray(todayFloorsStatus)) {
              const statusFloor = todayFloorsStatus.find(
                (f) => f.floorId === floor.floorId
              );
              if (statusFloor) {
                isCompleted =
                  statusFloor.completed === true ||
                  statusFloor.completed === "true" ||
                  statusFloor.completed === 1;
              }
            }

            // getFloorsStatusByDate에서 찾지 못하면 getTodayFloors()에서 확인
            if (!isCompleted) {
              if (
                floor.completed === true ||
                floor.completed === "true" ||
                floor.completed === 1
              ) {
                isCompleted = true;
              } else {
                // getSchedule()에서 확인 (fallback)
                try {
                  const detail = await getSchedule(floor.scheduleId);
                  const detailFloors = detail.floors || [];
                  const detailFloor = detailFloors.find(
                    (f) => f.floorId === floor.floorId
                  );
                  if (detailFloor) {
                    isCompleted =
                      detailFloor.completed === true ||
                      detailFloor.completed === "true" ||
                      detailFloor.completed === 1;
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
        if (data && data.imageUrl) {
          setCharacterImageUrl(data.imageUrl);
        } else {
        }
      } catch (error) {
        // 403 Forbidden은 로그인하지 않았거나 권한이 없는 경우이므로 조용히 처리
        if (error.status === 403) {
          return;
        }
        // 다른 오류는 콘솔에 기록
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

  // personalLevel이 변경되면 엘리베이터 애니메이션으로 층수 변경
  // 초기 로드만 애니메이션 없이 동기화
  useEffect(() => {
    const desired = Math.max(1, Number(personalLevel) || 1);
    if (!hasInitialFloorSyncRef.current) {
      setCurrentFloor(desired);
      hasInitialFloorSyncRef.current = true;
      return;
    }
    if (
      desired !== currentFloor &&
      !isMoving &&
      isOpen &&
      pendingFloorRef.current !== desired
    ) {
      goToFloor(desired);
    }
  }, [personalLevel]);

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

  // 오늘 날짜의 작업 목록 불러오기
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
      // 오늘 할 일 불러오기 (GET /api/floors/today)
      const todayFloors = await getTodayFloors();

      if (Array.isArray(todayFloors) && todayFloors.length > 0) {
        // floors를 scheduleId별로 그룹화
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

        // 오늘 날짜의 floor 상태 조회 (getFloorsStatusByDate 사용)
        let todayFloorsStatus = null;
        try {
          todayFloorsStatus = await getFloorsStatusByDate(todayStr);
        } catch (error) {}

        // 오늘 날짜의 tasks 변환
        const todayTasks = await Promise.all(
          Array.from(scheduleMap.values()).map(async (schedule) => {
            try {
              const detail = await getSchedule(schedule.scheduleId);
              const startDate = detail.startDate;

              // 오늘 날짜가 startDate로부터 몇 번째 날인지 계산
              const start = new Date(startDate);
              const target = new Date(todayStr);
              start.setHours(0, 0, 0, 0);
              target.setHours(0, 0, 0, 0);
              const daysDiff = Math.floor(
                (target - start) / (1000 * 60 * 60 * 24)
              );

              // schedule.floors의 첫 번째 floor 사용 (오늘 날짜의 floor)
              let todayFloorFromApi = null;
              let todayFloorFromDetail = null;

              if (schedule.floors.length > 0) {
                todayFloorFromApi = schedule.floors[0];
              }

              // 완료 상태 확인: getFloorsStatusByDate에서 우선 확인
              let completedStatus = false;
              const targetFloorId = todayFloorFromApi?.floorId;

              if (targetFloorId && todayFloorsStatus) {
                // getFloorsStatusByDate 결과에서 해당 floorId 찾기
                const statusFloor = Array.isArray(todayFloorsStatus)
                  ? todayFloorsStatus.find((f) => f.floorId === targetFloorId)
                  : null;
                if (statusFloor) {
                  completedStatus =
                    statusFloor.completed === true ||
                    statusFloor.completed === "true" ||
                    statusFloor.completed === 1;
                }
              }

              // getFloorsStatusByDate에서 찾지 못하면 getSchedule의 detail.floors에서 확인
              if (!completedStatus) {
                const detailFloors = detail.floors || [];
                todayFloorFromDetail =
                  detailFloors.find((f) => f.floorId === targetFloorId) ||
                  detailFloors[daysDiff] ||
                  detailFloors[0];

                if (todayFloorFromDetail) {
                  completedStatus =
                    todayFloorFromDetail.completed === true ||
                    todayFloorFromDetail.completed === "true" ||
                    todayFloorFromDetail.completed === 1;
                }
              }

              // 완료 상태 확인 (디버깅)
              const finalFloorId =
                todayFloorFromApi?.floorId || todayFloorFromDetail?.floorId;

              const subtasks = [
                {
                  id:
                    todayFloorFromApi?.floorId ||
                    todayFloorFromDetail?.floorId ||
                    `sub-${schedule.scheduleId}-0`,
                  floorId:
                    todayFloorFromApi?.floorId || todayFloorFromDetail?.floorId,
                  scheduleId: schedule.scheduleId,
                  text:
                    todayFloorFromApi?.title ||
                    todayFloorFromApi?.floorTitle ||
                    todayFloorFromDetail?.title ||
                    `단계 1`,
                  done: completedStatus,
                  dayNumber: daysDiff + 1,
                  // 팀 플랜 여부 확인 (teamId가 있으면 팀 플랜)
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

        // 완료된 항목을 아래로 정렬
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
                  done: floor.completed || false,
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

        // 진행도 계산: getFloorsStatusByDate 사용 (초기 로딩과 동일한 로직)
        // 위에서 이미 todayFloorsStatus를 가져왔으므로 재사용
        const total = todayFloors.length;
        let done = 0;

        // 각 floor의 completed 상태를 확인 (getFloorsStatusByDate 우선 사용)
        for (const floor of todayFloors) {
          let isCompleted = false;

          // 1. getFloorsStatusByDate에서 우선 확인
          if (todayFloorsStatus && Array.isArray(todayFloorsStatus)) {
            const statusFloor = todayFloorsStatus.find(
              (f) => f.floorId === floor.floorId
            );
            if (statusFloor) {
              isCompleted =
                statusFloor.completed === true ||
                statusFloor.completed === "true" ||
                statusFloor.completed === 1;
            }
          }

          // 2. getFloorsStatusByDate에서 찾지 못하면 getTodayFloors()에서 확인
          if (!isCompleted) {
            if (
              floor.completed === true ||
              floor.completed === "true" ||
              floor.completed === 1
            ) {
              isCompleted = true;
            } else {
              // 3. getSchedule()에서 확인 (fallback)
              try {
                const detail = await getSchedule(floor.scheduleId);
                const detailFloors = detail.floors || [];
                const detailFloor = detailFloors.find(
                  (f) => f.floorId === floor.floorId
                );
                if (detailFloor) {
                  isCompleted =
                    detailFloor.completed === true ||
                    detailFloor.completed === "true" ||
                    detailFloor.completed === 1;
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

        // API에서 층수 가져오기 (임의 계산하지 않음)
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
        // 페이지가 다시 보일 때 서버에서 최신 상태 불러오기
        loadTasks();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

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

  const handleSubtaskToggle = async (task, subtask, e) => {
    // 팀 플랜 항목은 처리하지 않음
    if (subtask.isTeamPlan) {
      e.preventDefault();
      alert("팀 플랜의 항목은 개인 플랜에서 완료할 수 없습니다.");
      return;
    }

    // 중복 클릭 방지: 이미 처리 중인지 확인
    if (!subtask.floorId) {
      e.preventDefault();
      return;
    }

    // 체크박스 상태 변경을 막고 수동으로 제어
    e.preventDefault();

    // 서버 상태를 먼저 확인 (로컬 상태와 서버 상태 불일치 방지)
    // getFloorsStatusByDate를 사용하여 정확한 완료 상태 확인
    let serverCompleted = false;
    try {
      const todayStr = formatDate(new Date());

      // 1. getFloorsStatusByDate로 완료 상태 확인 (가장 정확)
      try {
        const todayFloorsStatus = await getFloorsStatusByDate(todayStr);
        if (Array.isArray(todayFloorsStatus)) {
          const statusFloor = todayFloorsStatus.find(
            (f) => f.floorId === subtask.floorId
          );
          if (statusFloor) {
            serverCompleted =
              statusFloor.completed === true ||
              statusFloor.completed === "true" ||
              statusFloor.completed === 1;
          }
        }
      } catch (statusError) {
        // ignore
      }

      // 2. getFloorsStatusByDate에서 찾지 못하면 getSchedule에서 확인
      if (!serverCompleted) {
        try {
          const detail = await getSchedule(subtask.scheduleId);
          const detailFloors = detail.floors || [];
          const detailFloor = detailFloors.find(
            (f) => f.floorId === subtask.floorId
          );
          if (detailFloor) {
            serverCompleted =
              detailFloor.completed === true ||
              detailFloor.completed === "true" ||
              detailFloor.completed === 1;
          }
        } catch (scheduleError) {
          // ignore
        }
      }

      // 3. 서버 상태를 확인할 수 없는 경우 로컬 상태 사용
      if (!serverCompleted && subtask.done === true) {
        serverCompleted = true;
      }
    } catch (error) {
      serverCompleted = subtask.done;
    }

    // 서버 상태가 완료인 경우 → 완료 취소 처리
    if (serverCompleted === true) {
      try {
        // 1. 완료 취소 API 호출
        const uncompleteResult = await uncompleteFloor(subtask.floorId);

        // 2. 완료 표시 제거 (로컬 상태 즉시 업데이트)
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

        // 완료 취소된 task를 위로 이동 (미완료 항목과 함께)
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

        // 3. 오늘의 진행도 프로그레스바 변경 (getFloorsStatusByDate 사용)
        const todayStr = formatDate(new Date());
        try {
          const updatedStatus = await getFloorsStatusByDate(todayStr);
          if (Array.isArray(updatedStatus)) {
            const total = updatedStatus.length;
            const done = updatedStatus.filter(
              (f) =>
                f.completed === true ||
                f.completed === "true" ||
                f.completed === 1
            ).length;
            const percent = total > 0 ? Math.round((done / total) * 100) : 0;

            setTodayProgress({
              done,
              total,
              percent,
            });
          }
        } catch (progressError) {
          // 실패 시 getTodayFloors로 폴백
          const updatedTodayFloors = await getTodayFloors();
          if (Array.isArray(updatedTodayFloors)) {
            const total = updatedTodayFloors.length;
            let done = 0;
            for (const floor of updatedTodayFloors) {
              if (
                floor.completed === true ||
                floor.completed === "true" ||
                floor.completed === 1
              ) {
                done++;
              }
            }
            const percent = total > 0 ? Math.round((done / total) * 100) : 0;
            setTodayProgress({ done, total, percent });
          }
        }

        // 4. 층수 감소 (엘리베이터 애니메이션 포함)
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
          // 취소 시에도 엘레베이터 애니메이션 실행
          // currentFloor와 desired가 다를 때만 애니메이션 실행
          if (desired !== currentFloor && !isMoving) {
            // 애니메이션 먼저 실행 (문 닫기 시작)
            goToFloor(desired);
            // 애니메이션이 시작되면 personalLevel 업데이트 (useEffect가 isMoving을 확인하므로 애니메이션 중에는 currentFloor를 변경하지 않음)
            setPersonalLevel(nextPersonalLevel);
          } else {
            // 애니메이션 없이 personalLevel만 업데이트
            setPersonalLevel(nextPersonalLevel);
          }
        }
      } catch (error) {
        const errorMessage =
          error.data?.message ||
          error.data?.error ||
          error.message ||
          "알 수 없는 오류";

        // 400 에러 처리 (완료되지 않은 항목)
        if (error.status === 400) {
          // 서버 상태와 동기화를 위해 목록 다시 불러오기
          await loadTasks();
          return;
        }

        // 403 에러 처리 (권한 없음)
        if (error.status === 403) {
          alert(
            "이 항목을 취소할 권한이 없습니다. 개인 플랜의 항목만 취소할 수 있습니다."
          );
          await loadTasks();
          return;
        }

        // 기타 에러는 서버 상태로 동기화
        await loadTasks();
      }
      return;
    }

    // 서버 상태가 미완료인 경우 → 완료 처리
    try {
      // 1. 완료 API 호출
      const completeResult = await completeFloor(subtask.floorId);

      // 2. 계획에 완료표시 (로컬 상태 즉시 업데이트)
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

      // 완료된 task를 아래로 이동
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

      // 3. 오늘의 진행도 프로그레스바 변경 (getFloorsStatusByDate 사용)
      const todayStr = formatDate(new Date());
      try {
        const updatedStatus = await getFloorsStatusByDate(todayStr);
        if (Array.isArray(updatedStatus)) {
          const total = updatedStatus.length;
          const done = updatedStatus.filter(
            (f) =>
              f.completed === true ||
              f.completed === "true" ||
              f.completed === 1
          ).length;
          const percent = total > 0 ? Math.round((done / total) * 100) : 0;

          setTodayProgress({
            done,
            total,
            percent,
          });
        }
      } catch (progressError) {
        // 실패 시 getTodayFloors로 폴백
        const updatedTodayFloors = await getTodayFloors();
        if (Array.isArray(updatedTodayFloors)) {
          const total = updatedTodayFloors.length;
          let done = 0;
          for (const floor of updatedTodayFloors) {
            if (
              floor.completed === true ||
              floor.completed === "true" ||
              floor.completed === 1
            ) {
              done++;
            }
          }
          const percent = total > 0 ? Math.round((done / total) * 100) : 0;
          setTodayProgress({ done, total, percent });
        }
      }

      // 4. 층수 변경 (엘리베이터 애니메이션 포함)
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
        // 완료 시 엘레베이터 애니메이션 실행

        // desired가 currentFloor보다 큰 경우에만 애니메이션 실행 (층수 증가)
        if (desired > currentFloorBeforeUpdate && !isMoving && isOpen) {
          // 애니메이션 먼저 실행 (문 닫기 시작)
          // goToFloor를 먼저 호출하여 setIsOpen(false) 실행
          goToFloor(desired);
          // goToFloor 호출 직후 personalLevel 업데이트
          // goToFloor 내부에서 setIsOpen(false)가 즉시 실행되므로
          // 다음 렌더링 사이클에서 isOpen이 false가 되어 useEffect가 실행되어도
          // isOpen 체크로 인해 currentFloor를 변경하지 않음
          setPersonalLevel(nextPersonalLevel);
        } else {
          // 애니메이션 없이 personalLevel만 업데이트
          setPersonalLevel(nextPersonalLevel);
        }
      }
    } catch (error) {
      const errorMessage =
        error.data?.message ||
        error.data?.error ||
        error.message ||
        "알 수 없는 오류";

      // 400 에러 처리 (이미 완료된 항목)
      if (error.status === 400) {
        // 서버 상태를 다시 확인하고 UI 동기화
        try {
          const syncFloors = await getTodayFloors();
          const syncFloor = syncFloors.find(
            (f) => f.floorId === subtask.floorId
          );
          if (syncFloor && syncFloor.completed === true) {
            // 서버 상태가 완료이므로 UI만 동기화
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

            const total = syncFloors.length;
            const done = syncFloors.filter((f) => f.completed === true).length;
            const percent = total > 0 ? Math.round((done / total) * 100) : 0;
            setTodayProgress({ done, total, percent });
          }
        } catch (syncError) {
          // ignore
        }
        // 목록 다시 불러오기
        await loadTasks();
        return;
      }

      // 403 에러 처리 (권한 없음)
      if (error.status === 403) {
        alert(
          "이 항목을 완료할 권한이 없습니다. 개인 플랜의 항목만 완료할 수 있습니다."
        );
        await loadTasks();
        return;
      }

      alert(`완료 처리에 실패했습니다: ${errorMessage}`);
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

        const todayStr = formatDate(new Date());
        try {
          const updatedStatus = await getFloorsStatusByDate(todayStr);
          if (Array.isArray(updatedStatus)) {
            const total = updatedStatus.length;
            const done = updatedStatus.filter(
              (f) =>
                f.completed === true ||
                f.completed === "true" ||
                f.completed === 1
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
              if (
                floor.completed === true ||
                floor.completed === "true" ||
                floor.completed === 1
              ) {
                done++;
              }
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

      const todayStr = formatDate(new Date());
      try {
        const updatedStatus = await getFloorsStatusByDate(todayStr);
        if (Array.isArray(updatedStatus)) {
          const total = updatedStatus.length;
          const done = updatedStatus.filter(
            (f) =>
              f.completed === true ||
              f.completed === "true" ||
              f.completed === 1
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
            if (
              floor.completed === true ||
              floor.completed === "true" ||
              floor.completed === 1
            ) {
              done++;
            }
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

      {/* 테스트용 층수 추가 버튼 */}
      <div
        style={{
          display: "flex",
          gap: "10px",
          justifyContent: "center",
          marginTop: "10px",
          marginBottom: "10px",
          width: "100%",
          maxWidth: "var(--panel-width)",
          padding: "0 16px",
        }}
      >
        <button
          onClick={async () => {
            try {
              await addTestFloors(50);
              // 층수 갱신
              const profile = await getMyProfile();
              if (profile?.personalLevel) {
                setPersonalLevel(profile.personalLevel);
              }
              alert("50층이 추가되었습니다.");
            } catch (error) {
              alert("50층 추가에 실패했습니다.");
            }
          }}
          style={{
            padding: "10px 20px",
            borderRadius: "12px",
            backgroundColor: "#0A7C88",
            color: "#fff",
            border: "none",
            fontSize: "14px",
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "var(--font-pixel-kr)",
            flex: 1,
          }}
        >
          50층 추가
        </button>
        <button
          onClick={async () => {
            try {
              await addTestFloors(100);
              // 층수 갱신
              const profile = await getMyProfile();
              if (profile?.personalLevel) {
                setPersonalLevel(profile.personalLevel);
              }
              alert("100층이 추가되었습니다.");
            } catch (error) {
              alert("100층 추가에 실패했습니다.");
            }
          }}
          style={{
            padding: "10px 20px",
            borderRadius: "12px",
            backgroundColor: "#0A7C88",
            color: "#fff",
            border: "none",
            fontSize: "14px",
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "var(--font-pixel-kr)",
            flex: 1,
          }}
        >
          100층 추가
        </button>
      </div>

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
          // 다른 탭 있으면 여기도 라우팅
        }}
      />

      {showWeeklyModal && (
        <WeeklyAchievementModal onClose={() => setShowWeeklyModal(false)} />
      )}
    </div>
  );
}
