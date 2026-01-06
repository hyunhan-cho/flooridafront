import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ElevatorDoor from "../components/ElevatorDoor.jsx";
import QuestList from "../components/QuestList.jsx";
import { floors } from "../constants/floors.js";
import BackButton from "../components/BackButton.jsx";
import Navbar from "../components/Navbar.jsx";
import WeeklyAchievementModal from "../components/WeeklyAchievementModal.jsx";
import { getMyCharacter, getCalendarStats, getSchedules, getSchedule, updateFloorCompletion, deleteSchedule, getFloorsStatusByDate } from "../services/api.js";
import { AUTH_TOKEN_KEY } from "../config.js";

import "../App.css";
import floorBoardImg from "../assets/img/board 1.png";
import backgroundImg from "../assets/img/image 20.png";

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

  // 오늘 날짜의 작업 목록 불러오기
  const loadTasks = async () => {
    const today = new Date();
    const todayStr = formatDate(today);
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const token = localStorage.getItem(AUTH_TOKEN_KEY);

    setLoading(true);

    if (!token) {
      setTasks([]);
      setUndoneTasks([]);
      setLoading(false);
      return;
    }

    try {
      // 오늘 날짜의 floors 가져오기
      const todayFloors = await getFloorsStatusByDate(todayStr);
      
      // 모든 일정 가져오기 (미달성 퀘스트를 위해)
      const allSchedules = await getSchedules({ year, month });

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
              const daysDiff = Math.floor((target - start) / (1000 * 60 * 60 * 24));
              
              // 오늘 날짜에 해당하는 floor만 필터링
              const todayFloor = schedule.floors.find((f, index) => {
                // floor의 순서를 기반으로 날짜 매칭
                return index === daysDiff || (daysDiff >= 0 && daysDiff < schedule.floors.length && index === daysDiff);
              }) || schedule.floors[0]; // 매칭되는 것이 없으면 첫 번째 floor 사용

              const subtasks = [{
                id: todayFloor.floorId || `sub-${schedule.scheduleId}-0`,
                floorId: todayFloor.floorId,
                scheduleId: schedule.scheduleId,
                text: todayFloor.title || todayFloor.floorTitle || `단계 1`,
                done: todayFloor.completed || false,
                dayNumber: daysDiff + 1,
              }];

              return {
                id: schedule.scheduleId?.toString() || `task-${Date.now()}`,
                title: schedule.title,
                progress: `${subtasks.filter((s) => s.done).length}/${subtasks.length}`,
                subtasks,
                color: schedule.color,
                startDate: detail.startDate,
                endDate: detail.endDate,
              };
            } catch (err) {
              console.warn(`Schedule ${schedule.scheduleId} 상세 정보 로드 실패:`, err);
              return null;
            }
          })
        );

        const validTodayTasks = todayTasks.filter(t => t !== null);
        setTasks(validTodayTasks);

        // 미달성 퀘스트 찾기 (과거 날짜에 있지만 완료되지 않은 계획)
        const undoneQuestsList = [];
        if (Array.isArray(allSchedules) && allSchedules.length > 0) {
          for (const schedule of allSchedules) {
            try {
              const detail = await getSchedule(schedule.scheduleId);
              const startDate = new Date(detail.startDate);
              const endDate = new Date(detail.endDate);
              const todayDate = new Date(todayStr);
              
              // 과거 날짜에 있는 계획인지 확인
              if (endDate < todayDate) {
                // 과거 계획의 모든 floors 가져오기
                const floors = detail.floors || [];
                const undoneFloors = floors.filter(f => !f.completed);
                
                if (undoneFloors.length > 0) {
                  // 과거 날짜 계산
                  const undoneSubtasks = undoneFloors.map((floor, index) => {
                    const floorDate = new Date(startDate);
                    floorDate.setDate(startDate.getDate() + index);
                    const daysDiff = Math.floor((floorDate - startDate) / (1000 * 60 * 60 * 24));
                    
                    return {
                      id: floor.floorId || `sub-${schedule.scheduleId}-${index}`,
                      floorId: floor.floorId,
                      scheduleId: schedule.scheduleId,
                      text: floor.title || `단계 ${index + 1}`,
                      done: floor.completed || false,
                      dayNumber: daysDiff + 1,
                      scheduledDate: formatDate(floorDate),
                    };
                  });

                  const doneCount = undoneSubtasks.filter(s => s.done).length;
                  undoneQuestsList.push({
                    id: schedule.scheduleId?.toString() || `task-${Date.now()}`,
                    title: schedule.title || "제목 없음",
                    progress: `${doneCount}/${undoneSubtasks.length}`,
                    subtasks: undoneSubtasks,
                    color: schedule.color || "#3a8284",
                  });
                }
              }
            } catch (err) {
              console.warn(`미달성 퀘스트 로드 실패 (${schedule.scheduleId}):`, err);
            }
          }
        }
        setUndoneTasks(undoneQuestsList);

        // 오늘 작업 목록의 총 subtask 개수로 todayProgress 업데이트
        const totalSubtasks = validTodayTasks.reduce((sum, task) => {
          return sum + task.subtasks.length;
        }, 0);
        const doneSubtasks = validTodayTasks.reduce((sum, task) => {
          return sum + task.subtasks.filter((s) => s.done).length;
        }, 0);
        
        setTodayProgress((prev) => ({
          ...prev,
          total: totalSubtasks,
          done: doneSubtasks,
          percent: totalSubtasks > 0 ? Math.round((doneSubtasks / totalSubtasks) * 100) : 0,
        }));
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
      console.error("일정 로드 실패:", error);
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
      console.error("일정 삭제 실패:", error);
      alert("일정 삭제에 실패했습니다. 다시 시도해주세요.");
    }
  };


  return (
    <div className="app home-view">
      <BackButton />

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
            <span className="floor-indicator-number">{currentFloor}</span>
          </div>
          <div className="floor-scene">
            <img 
              src={backgroundImg} 
              alt="배경"
              className="floor-background-img"
            />
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

      {/* 작업 목록 섹션 */}
      {loading ? (
        <div
          style={{
            textAlign: "center",
            padding: "40px",
            color: "#6b7280",
            fontFamily: "var(--font-pixel-kr)",
            width: "100%",
            maxWidth: "var(--panel-width)",
            margin: "0 auto",
          }}
        >
          로딩 중...
        </div>
      ) : tasks.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "40px",
            color: "#6b7280",
            fontFamily: "var(--font-pixel-kr)",
            width: "100%",
            maxWidth: "var(--panel-width)",
            margin: "0 auto",
          }}
        >
          등록된 계획이 없습니다.
        </div>
      ) : (
        tasks.map((task) => {
          const allDone = task.subtasks.length > 0 && task.subtasks.every((s) => s.done);
          return (
            <div
              key={task.id}
              className="card"
              style={{
                background: "#e5e7eb",
                borderRadius: "18px",
                width: "100%",
                maxWidth: "var(--panel-width)",
                padding: "14px",
                margin: "0 16px 12px 16px",
                display: "flex",
                alignItems: "flex-start",
                gap: "12px",
                transition: "all 0.5s ease-in-out",
                transform: "translateY(0)",
                opacity: 1,
              }}
            >
            <div
              style={{
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                background: task.color,
                flexShrink: 0,
                marginTop: "2px",
              }}
            />
            <div style={{ flex: 1 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "8px",
                }}
              >
                <span
                  style={{
                    fontSize: "15px",
                    fontWeight: 800,
                    color: "#111827",
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  {task.title}
                </span>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <span
                    style={{
                      background: "#d1d5db",
                      color: "#111827",
                      padding: "4px 10px",
                      borderRadius: "12px",
                      fontSize: "12px",
                      fontWeight: 700,
                      fontFamily: "var(--font-sans)",
                    }}
                  >
                    {task.progress}
                  </span>
                </div>
              </div>
              {task.subtasks.map((subtask) => (
                <div
                  key={subtask.id}
                  style={{
                    background: subtask.done ? "#9ca3af" : "#f3f4f6",
                    borderRadius: "8px",
                    padding: "8px 12px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "4px",
                    opacity: subtask.done ? 0.7 : 1,
                    transition: "all 0.3s ease",
                    transform: subtask.done ? "scale(0.98)" : "scale(1)",
                  }}
                >
                  <span
                    style={{
                      fontSize: "13px",
                      color: subtask.done ? "#6b7280" : "#111827",
                      fontFamily: "var(--font-sans)",
                      textDecoration: subtask.done ? "line-through" : "none",
                    }}
                  >
                    {subtask.text}
                  </span>
                  <input
                    type="checkbox"
                    checked={subtask.done}
                    onChange={async () => {
                      const newDoneState = !subtask.done;

                      // API에 완료 상태 저장
                      if (subtask.floorId) {
                        try {
                          console.log("Floor 완료 상태 업데이트:", {
                            floorId: subtask.floorId,
                            scheduleId: subtask.scheduleId,
                            completed: newDoneState,
                          });
                          await updateFloorCompletion(
                            subtask.floorId,
                            newDoneState,
                            subtask.scheduleId
                          );
                        } catch (error) {
                          console.error("완료 상태 업데이트 실패:", error);
                        }
                      }

                      // 로컬 상태 업데이트
                      const newTasks = tasks.map((t) => {
                        if (t.id !== task.id) return t;
                        const updatedSubtasks = t.subtasks.map((s) =>
                          s.id === subtask.id
                            ? { ...s, done: newDoneState }
                            : s
                        );
                        const doneCount = updatedSubtasks.filter(
                          (s) => s.done
                        ).length;
                        return {
                          ...t,
                          subtasks: updatedSubtasks,
                          progress: `${doneCount}/${updatedSubtasks.length}`,
                        };
                      });

                      // 완료된 task(모든 subtask가 완료된 경우)를 맨 아래로 이동
                      const sortedTasks = [...newTasks].sort((a, b) => {
                        const aAllDone = a.subtasks.length > 0 && a.subtasks.every((s) => s.done);
                        const bAllDone = b.subtasks.length > 0 && b.subtasks.every((s) => s.done);
                        
                        // 완료된 항목은 아래로, 미완료 항목은 위로
                        if (aAllDone && !bAllDone) return 1;
                        if (!aAllDone && bAllDone) return -1;
                        return 0; // 같은 상태면 순서 유지
                      });

                      setTasks(sortedTasks);

                      // 모든 tasks의 완료된 subtask 개수 계산하여 progressInfo 및 todayProgress 업데이트
                      const totalDone = sortedTasks.reduce((sum, t) => {
                        return sum + t.subtasks.filter((s) => s.done).length;
                      }, 0);
                      const totalTasks = sortedTasks.reduce((sum, t) => {
                        return sum + t.subtasks.length;
                      }, 0);

                      setProgressInfo((prev) => ({
                        ...prev,
                        done: totalDone,
                        total: totalTasks,
                        percent: totalTasks > 0 ? Math.round((totalDone / totalTasks) * 100) : 0,
                      }));

                      setTodayProgress((prev) => ({
                        ...prev,
                        done: totalDone,
                        total: totalTasks,
                        percent: totalTasks > 0 ? Math.round((totalDone / totalTasks) * 100) : 0,
                      }));
                    }}
                    style={{
                      width: "18px",
                      height: "18px",
                      cursor: "pointer",
                      transition: "transform 0.2s ease",
                    }}
                    onMouseDown={(e) => {
                      e.currentTarget.style.transform = "scale(0.9)";
                    }}
                    onMouseUp={(e) => {
                      e.currentTarget.style.transform = "scale(1)";
                    }}
                  />
                </div>
              ))}
              </div>
            </div>
          );
        })
      )}

      {/* 미달성 퀘스트 섹션 */}
      {undoneTasks.length > 0 && (
        <div
          style={{
            width: "100%",
            maxWidth: "var(--panel-width)",
            margin: "0 16px 12px 16px",
          }}
        >
          {/* 헤더 */}
          <div
            className="card"
            onClick={() => setShowUndoneQuests(!showUndoneQuests)}
            style={{
              background: "#FF9090",
              borderRadius: "18px",
              borderBottomLeftRadius: showUndoneQuests ? "12px" : "18px",
              borderBottomRightRadius: showUndoneQuests ? "12px" : "18px",
              width: "100%",
              padding: "14px 16px",
              paddingBottom: showUndoneQuests ? "18px" : "14px",
              marginBottom: showUndoneQuests ? "0" : "12px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              cursor: "pointer",
            }}
          >
            <span
              style={{
                fontSize: "15px",
                fontWeight: 800,
                color: "#111827",
                fontFamily: "var(--font-pixel-kr)",
              }}
            >
              미달성 퀘스트
            </span>
            <span
              style={{
                fontSize: "12px",
                color: "#6b7280",
                transform: showUndoneQuests ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s ease",
              }}
            >
              ▼
            </span>
          </div>

          {/* 미달성 퀘스트 목록 (토글) */}
          {showUndoneQuests && (
            <div
              className="card"
              style={{
                background: "#f3f4f6",
                borderRadius: "18px",
                borderTopLeftRadius: "0",
                borderTopRightRadius: "0",
                width: "100%",
                padding: "14px",
                paddingTop: "18px",
                marginTop: "-4px",
              }}
            >
              {undoneTasks.map((task) => {
                const allDone = task.subtasks.length > 0 && task.subtasks.every((s) => s.done);
                return (
                <div
                  key={task.id}
                  style={{
                    background: "#e5e7eb",
                    borderRadius: "18px",
                    width: "100%",
                    padding: "14px",
                    marginBottom: "12px",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "12px",
                    transition: "all 0.5s ease-in-out",
                    opacity: allDone ? 0.7 : 1,
                  }}
                >
                  <div
                    style={{
                      width: "24px",
                      height: "24px",
                      borderRadius: "50%",
                      background: task.color,
                      flexShrink: 0,
                      marginTop: "2px",
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "8px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "15px",
                          fontWeight: 800,
                          color: "#111827",
                          fontFamily: "var(--font-sans)",
                        }}
                      >
                        {task.title}
                      </span>
                      <span
                        style={{
                          background: "#d1d5db",
                          color: "#111827",
                          padding: "4px 10px",
                          borderRadius: "12px",
                          fontSize: "12px",
                          fontWeight: 700,
                          fontFamily: "var(--font-sans)",
                        }}
                      >
                        {task.progress}
                      </span>
                    </div>
                    {task.subtasks.map((subtask) => {
                      const subtaskDone = subtask.done || false;
                      return (
                        <div
                          key={subtask.id}
                          style={{
                            background: subtaskDone ? "#9ca3af" : "#f3f4f6",
                            borderRadius: "8px",
                            padding: "8px 12px",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "4px",
                            opacity: subtaskDone ? 0.7 : 1,
                            transition: "all 0.3s ease",
                            transform: subtaskDone ? "scale(0.98)" : "scale(1)",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "13px",
                              color: subtaskDone ? "#6b7280" : "#111827",
                              fontFamily: "var(--font-sans)",
                              textDecoration: subtaskDone ? "line-through" : "none",
                            }}
                          >
                            {subtask.dayNumber}일차
                          </span>
                          <input
                            type="checkbox"
                            checked={subtaskDone}
                            onChange={async () => {
                              const newDoneState = !subtaskDone;

                              // API에 완료 상태 저장
                              if (subtask.floorId) {
                                try {
                                  await updateFloorCompletion(
                                    subtask.floorId,
                                    newDoneState,
                                    subtask.scheduleId
                                  );
                                } catch (error) {
                                  console.error("완료 상태 업데이트 실패:", error);
                                }
                              }

                              // 로컬 상태 업데이트
                              const newUndoneTasks = undoneTasks.map((t) => {
                                if (t.id !== task.id) return t;
                                const updatedSubtasks = t.subtasks.map((s) =>
                                  s.id === subtask.id
                                    ? { ...s, done: newDoneState }
                                    : s
                                );
                                const doneCount = updatedSubtasks.filter(
                                  (s) => s.done
                                ).length;
                                return {
                                  ...t,
                                  subtasks: updatedSubtasks,
                                  progress: `${doneCount}/${updatedSubtasks.length}`,
                                };
                              });

                              // 완료된 task(모든 subtask가 완료된 경우)를 맨 아래로 이동
                              const sortedUndoneTasks = [...newUndoneTasks].sort((a, b) => {
                                const aAllDone = a.subtasks.length > 0 && a.subtasks.every((s) => s.done);
                                const bAllDone = b.subtasks.length > 0 && b.subtasks.every((s) => s.done);
                                
                                // 완료된 항목은 아래로, 미완료 항목은 위로
                                if (aAllDone && !bAllDone) return 1;
                                if (!aAllDone && bAllDone) return -1;
                                return 0; // 같은 상태면 순서 유지
                              });

                              setUndoneTasks(sortedUndoneTasks);

                              // 층수 업데이트 (오늘의 진행도에는 포함되지 않지만 층수는 올라감)
                              if (newDoneState) {
                                setProgressInfo((prev) => ({
                                  ...prev,
                                  done: prev.done + 1,
                                  total: prev.total + 1,
                                  percent:
                                    prev.total + 1 > 0
                                      ? Math.round(
                                          ((prev.done + 1) / (prev.total + 1)) *
                                            100
                                        )
                                      : 0,
                                }));
                              } else {
                                setProgressInfo((prev) => ({
                                  ...prev,
                                  done: Math.max(0, prev.done - 1),
                                  total: Math.max(0, prev.total - 1),
                                  percent:
                                    prev.total - 1 > 0
                                      ? Math.round(
                                          ((prev.done - 1) / (prev.total - 1)) *
                                            100
                                        )
                                      : 0,
                                }));
                              }
                            }}
                            style={{
                              width: "18px",
                              height: "18px",
                              cursor: "pointer",
                              transition: "transform 0.2s ease",
                            }}
                            onMouseDown={(e) => {
                              e.currentTarget.style.transform = "scale(0.9)";
                            }}
                            onMouseUp={(e) => {
                              e.currentTarget.style.transform = "scale(1)";
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>
      )}

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
