// pages/MyCalendar.jsx
import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar.jsx";
import PersonalHeader from "../components/PersonalHeader.jsx";
import AiPlanFormNew from "./mycalendar/AiPlanFormNew.jsx";
import AiPlanLoading from "./mycalendar/AiPlanLoading.jsx";
import AiPlanResult from "./mycalendar/AiPlanResult.jsx";
import { API_BASE_URL, AUTH_TOKEN_KEY } from "../config.js";
import {
  getSchedules,
  getSchedule,
  getFloorsStatusByDate,
  deleteSchedule,
  updateFloorCompletion,
} from "../services/api.js";

function buildMonthMatrix(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const firstWeekday = (first.getDay() + 6) % 7;
  const totalDays = last.getDate();
  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

const weekdayLabels = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

// AI 호출 실패했을 때 임시로 보여줄 더미 일정
function buildFallbackSchedule({ goal, startDate, endDate }) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    return {
      scheduleId: -1,
      title: goal || "AI 플랜",
      startDate: today.toISOString().slice(0, 10),
      endDate: tomorrow.toISOString().slice(0, 10),
      color: "#FDBA74",
      teamId: null,
      floors: [],
    };
  }

  const days =
    Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const steps = Math.min(8, Math.max(3, Math.round(days / 2)));
  const floors = [];
  for (let i = 0; i < steps; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + Math.floor((days * i) / steps));
    floors.push({
      floorId: i + 1,
      title: `${i + 1}단계: ${goal || "계획"}`,
      scheduledDate: d.toISOString().slice(0, 10),
    });
  }

  return {
    scheduleId: -1,
    title: goal || "AI 플랜",
    startDate,
    endDate,
    color: "#FDBA74",
    teamId: null,
    floors,
  };
}

// 날짜를 YYYY-MM-DD 형식으로 변환
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function MyCalendar() {
  const [currentDate, setCurrentDate] = useState(() => new Date()); //
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);
  const [showAiPlanForm, setShowAiPlanForm] = useState(false);
  const [aiPlanStep, setAiPlanStep] = useState("form"); // "form" | "loading" | "result"
  const [schedule, setSchedule] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null); // 선택된 날짜

  // 2. tasks를 상태(State)로 선언해야 화면이 업데이트됩니다.
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const cells = buildMonthMatrix(currentDate);
  const today = new Date();
  const isToday = (d) =>
    d &&
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();

  const monthYear = `${currentDate.getFullYear()}년 ${
    currentDate.getMonth() + 1
  }월`;

  const goToPrevMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    );
  };

  const goToNextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    );
  };

  // 선택된 날짜의 할 일 불러오기
  const loadTasksForDate = async (date) => {
    if (!date) {
      // 날짜가 선택되지 않으면 전체 일정 불러오기
      await loadTasks();
      return;
    }

    const dateStr = formatDate(date);
    const token = localStorage.getItem(AUTH_TOKEN_KEY);

    setLoading(true);

    if (!token) {
      setTasks([]);
      setLoading(false);
      return;
    }

    try {
      const floors = await getFloorsStatusByDate(dateStr);
      console.log(`날짜 ${dateStr}의 floors status:`, floors);
      if (Array.isArray(floors) && floors.length > 0) {
        console.log(`첫 번째 floor 구조:`, floors[0]);
      }

      if (Array.isArray(floors) && floors.length > 0) {
        // floors를 scheduleId별로 그룹화
        const scheduleMap = new Map();

        floors.forEach((floor) => {
          const scheduleId = floor.scheduleId;
          const totalFloors =
            floor.totalFloors ||
            floor.totalFloorCount ||
            floor.scheduleFloorCount ||
            floor.floorCount;

          if (!scheduleMap.has(scheduleId)) {
            scheduleMap.set(scheduleId, {
              scheduleId,
              title: floor.scheduleTitle || "제목 없음",
              color: floor.scheduleColor || "#3a8284",
              totalFloors: totalFloors || 0, // 전체 계획 수 (있다면 저장)
              floors: [],
            });
          }
          const entry = scheduleMap.get(scheduleId);
          // 혹시 뒤에서 온 floor에 totalFloors 정보가 있다면 갱신
          if (totalFloors && !entry.totalFloors) {
            entry.totalFloors = totalFloors;
          }
          entry.floors.push(floor);
        });

        // tasks 형식으로 변환
        const convertedTasks = Array.from(scheduleMap.values()).map(
          (schedule) => {
            const subtasks = schedule.floors.map((floor, index) => {
              // API 응답 구조에 따라 title 필드 확인
              const floorTitle =
                floor.title ||
                floor.floorTitle ||
                floor.name ||
                floor.description;
              return {
                id: floor.floorId || `sub-${schedule.scheduleId}-${index}`,
                floorId: floor.floorId, // API 호출을 위해 floorId 저장
                scheduleId: schedule.scheduleId, // API 호출을 위해 scheduleId 저장
                text: floorTitle || `단계 ${index + 1}`,
                done: floor.completed || floor.done || false,
              };
            });

            const doneCount = subtasks.filter((s) => s.done).length;
            // 전체 계획 수: API에서 내려주는 totalFloors가 있으면 사용, 없으면 현재 보이는 단계 수 사용
            const totalSteps =
              schedule.totalFloors && schedule.totalFloors > 0
                ? schedule.totalFloors
                : subtasks.length;

            return {
              id: schedule.scheduleId?.toString() || `task-${Date.now()}`,
              title: schedule.title,
              progress: `${doneCount}/${totalSteps}`,
              subtasks,
              color: schedule.color,
            };
          }
        );

        console.log("변환된 tasks:", convertedTasks);
        setTasks(convertedTasks);
      } else {
        setTasks([]);
      }
    } catch (error) {
      console.error("날짜별 할 일 로드 실패:", error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  // API에서 일정 목록 불러오기
  const loadTasks = async () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const token = localStorage.getItem(AUTH_TOKEN_KEY);

    setLoading(true);

    if (!token) {
      setTasks([]);
      setLoading(false);
      return;
    }

    try {
      const data = await getSchedules({ year, month });
      console.log("API 응답 데이터:", data);

      if (Array.isArray(data) && data.length > 0) {
        // 각 일정의 floors를 가져오기 위해 getSchedule API 호출
        const convertedTasks = await Promise.all(
          data.map(async (schedule) => {
            let floors = schedule.floors || [];

            // floors가 없거나 비어있으면 getSchedule로 상세 정보 가져오기
            if (!floors || floors.length === 0) {
              try {
                const detail = await getSchedule(schedule.scheduleId);
                floors = detail.floors || [];
                console.log(
                  `Schedule ${schedule.scheduleId} 상세 정보:`,
                  detail
                );
              } catch (err) {
                console.warn(
                  `Schedule ${schedule.scheduleId} 상세 정보 로드 실패:`,
                  err
                );
                floors = [];
              }
            }

            const subtasks = floors.map((floor, index) => ({
              id: floor.floorId || `sub-${schedule.scheduleId}-${index}`,
              floorId: floor.floorId, // API 호출을 위해 floorId 저장
              scheduleId: schedule.scheduleId, // API 호출을 위해 scheduleId 저장
              text: floor.title || `단계 ${index + 1}`,
              done: floor.completed || false,
            }));

            // 완료된 subtask 개수 계산
            const doneCount = subtasks.filter((s) => s.done).length;

            return {
              id: schedule.scheduleId?.toString() || `task-${Date.now()}`,
              title: schedule.title || "제목 없음",
              progress: `${doneCount}/${subtasks.length}`,
              subtasks,
              color: schedule.color || "#3a8284",
            };
          })
        );

        console.log("변환된 tasks:", convertedTasks);
        setTasks(convertedTasks);
      } else {
        // 데이터가 없으면 빈 배열
        setTasks([]);
      }
    } catch (error) {
      console.error("일정 로드 실패:", error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  // 컴포넌트 마운트 시 및 currentDate 변경 시 일정 불러오기
  useEffect(() => {
    if (selectedDate) {
      loadTasksForDate(selectedDate);
    } else {
      loadTasks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate]);

  // selectedDate 변경 시 해당 날짜의 할 일 불러오기
  useEffect(() => {
    if (selectedDate) {
      loadTasksForDate(selectedDate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  // AI 생성 일정을 메인 목록에 추가하는 핸들러
  const handleConfirmAiSchedule = async () => {
    if (!schedule) return;

    alert("일정이 캘린더 목록에 추가되었습니다!");

    // 화면 전환
    setShowAiPlanForm(false);
    setAiPlanStep("form");
    setSchedule(null);

    // 일정 목록 다시 불러오기 (서버에 저장된 최신 데이터 반영)
    await loadTasks();
  };

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

      // 일정 목록 다시 불러오기
      if (selectedDate) {
        await loadTasksForDate(selectedDate);
      } else {
        await loadTasks();
      }
    } catch (error) {
      console.error("일정 삭제 실패:", error);
      alert("일정 삭제에 실패했습니다. 다시 시도해주세요.");
    }
  };

  // AI 플랜 폼 화면
  if (showAiPlanForm) {
    return (
      <div className="app home-view">
        <PersonalHeader />
        <main
          className="page-content"
          style={{
            width: "100%",
            display: "flex",
            justifyContent: "center",
            marginTop: "15px",
            marginBottom: "15px",
          }}
        >
          {aiPlanStep === "form" && (
            <AiPlanFormNew
              onSubmit={async ({ goal, startDate, endDate }) => {
                setAiPlanStep("loading");
                const payload = { goal, startDate, endDate, teamId: null };

                try {
                  const token = localStorage.getItem(AUTH_TOKEN_KEY);
                  const res = await fetch(
                    `${API_BASE_URL.replace(/\/$/, "")}/api/schedules/ai`,
                    {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                      },
                      body: JSON.stringify(payload),
                    }
                  );

                  if (!res.ok) {
                    const fallback = buildFallbackSchedule(payload);
                    setSchedule(fallback);
                    setAiPlanStep("result");
                    return;
                  }

                  const data = await res.json();
                  setSchedule(data);
                  setAiPlanStep("result");
                } catch (e) {
                  console.error(e);
                  const fallback = buildFallbackSchedule(payload);
                  setSchedule(fallback);
                  setAiPlanStep("result");
                }
              }}
              error={null}
              onBack={() => {
                setShowAiPlanForm(false);
                setAiPlanStep("form");
                setSchedule(null);
              }}
            />
          )}
          {aiPlanStep === "loading" && (
            <div
              className="card"
              style={{
                background: "#ffffff",
                borderRadius: "28px",
                minHeight: "870px",
                boxShadow: "0 20px 40px rgba(0,0,0,0.35)",
                margin: 0,
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <AiPlanLoading />
            </div>
          )}
          {aiPlanStep === "result" && schedule && (
            <div
              className="card"
              style={{
                background: "#ffffff",
                borderRadius: "28px",
                minHeight: "870px",
                boxShadow: "0 20px 40px rgba(0,0,0,0.35)",
                margin: 0,
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "flex-start",
              }}
            >
              <AiPlanResult
                schedule={schedule}
                // 2. 여기서 onConfirm 이벤트에 핸들러를 연결합니다.
                onConfirm={handleConfirmAiSchedule}
                onRestart={() => {
                  setSchedule(null);
                  setAiPlanStep("form");
                }}
                onScheduleUpdate={setSchedule}
              />
            </div>
          )}
        </main>
        <Navbar />
      </div>
    );
  }

  // 메인 캘린더 화면
  return (
    <div className="app home-view">
      <PersonalHeader />

      <main
        className="page-content"
        style={{
          width: "100vw",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          marginTop: "0",
          marginBottom: "0",
          gap: "0",
          marginLeft: "calc(50% - 50vw)",
          marginRight: "calc(50% - 50vw)",
          paddingTop: "0",
        }}
      >
        {/* 달력 섹션 */}
        <div
          style={{
            background: "#EEEEEE",
            borderRadius: "0",
            width: "100%",
            padding: "12px 0",
            margin: 0,
          }}
        >
          {/* 월/년 헤더 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "12px",
              padding: "0 12px",
            }}
          >
            <button
              onClick={goToPrevMonth}
              style={{
                background: "transparent",
                border: "none",
                fontSize: "18px",
                cursor: "pointer",
                color: "#111827",
              }}
            >
              ←
            </button>
            <h2
              style={{
                margin: 0,
                fontSize: "18px",
                fontWeight: 900,
                color: "#111827",
                fontFamily: "var(--font-pixel-kr)",
              }}
            >
              {monthYear}
            </h2>
            <button
              onClick={goToNextMonth}
              style={{
                background: "transparent",
                border: "none",
                fontSize: "18px",
                cursor: "pointer",
                color: "#111827",
              }}
            >
              →
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: "4px",
              marginBottom: "10px",
              textAlign: "center",
              fontSize: "12px",
              fontWeight: 900,
              color: "#6b7280",
              textTransform: "lowercase",
              background: "#d9dde3",
              borderRadius: "12px",
              padding: "6px 12px",
              margin: "0 12px 10px 12px",
            }}
          >
            {weekdayLabels.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: "8px",
              padding: "0 12px",
            }}
          >
            {cells.map((d, i) => {
              const isTodayCell = isToday(d);
              const isSelected =
                selectedDate &&
                d &&
                selectedDate.getFullYear() === d.getFullYear() &&
                selectedDate.getMonth() === d.getMonth() &&
                selectedDate.getDate() === d.getDate();

              return (
                <div
                  key={i}
                  onClick={() => {
                    if (d) {
                      setSelectedDate(d);
                    }
                  }}
                  style={{
                    aspectRatio: "1",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "14px",
                    fontWeight: 900,
                    color: d ? "#111827" : "transparent",
                    background: isSelected
                      ? "#9ca3af"
                      : isTodayCell
                      ? "#d1d5db"
                      : "transparent",
                    borderRadius: isTodayCell || isSelected ? "50%" : "8px",
                    cursor: d ? "pointer" : "default",
                    transition: "background-color 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (d && !isSelected && !isTodayCell) {
                      e.currentTarget.style.backgroundColor = "#e5e7eb";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (d && !isSelected && !isTodayCell) {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }
                  }}
                >
                  {d ? d.getDate() : ""}
                </div>
              );
            })}
          </div>
        </div>

        {/* 액션 버튼 */}
        <div
          style={{
            display: "flex",
            gap: "12px",
            width: "100%",
            maxWidth: "var(--panel-width)",
            position: "relative",
            marginTop: "20px",
            marginBottom: "20px",
            marginLeft: "16px",
            marginRight: "16px",
            padding: "0",
          }}
        >
          <button
            style={{
              flex: 1,
              background: "var(--brand-teal)",
              color: "#fff",
              border: "none",
              borderRadius: "12px",
              padding: "14px",
              fontSize: "14px",
              fontWeight: 800,
              cursor: "pointer",
              fontFamily: "var(--font-pixel-kr)",
            }}
          >
            캘린더 추가하기
          </button>
          <button
            onClick={() => setShowAddProjectModal(true)}
            style={{
              flex: 1,
              background: "var(--brand-teal)",
              color: "#fff",
              border: "none",
              borderRadius: "12px",
              padding: "14px",
              fontSize: "14px",
              fontWeight: 800,
              cursor: "pointer",
              fontFamily: "var(--font-pixel-kr)",
            }}
          >
            프로젝트 추가하기
          </button>
        </div>

        {/* 3. 작업 목록 섹션 (반드시 tasks.map을 사용해야 합니다!) */}
        {loading ? (
          <div
            style={{
              textAlign: "center",
              padding: "40px",
              color: "#6b7280",
              fontFamily: "var(--font-pixel-kr)",
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
            }}
          >
            등록된 계획이 없습니다.
          </div>
        ) : (
          tasks.map((task) => (
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
                    <button
                      onClick={() => handleDeleteSchedule(task.id)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "#111827",
                        fontSize: "18px",
                        fontWeight: 700,
                        cursor: "pointer",
                        padding: "4px 8px",
                        fontFamily: "var(--font-sans)",
                      }}
                      title="일정 삭제"
                    >
                      X
                    </button>
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
                            console.error("에러 상세:", {
                              status: error.status,
                              message: error.message,
                              data: error.data,
                              floorId: subtask.floorId,
                              scheduleId: subtask.scheduleId,
                            });
                            // 에러가 발생해도 로컬 상태는 업데이트 (사용자 경험 개선)
                            // alert는 제거하고 조용히 처리
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
                        setTasks(newTasks);
                      }}
                      style={{
                        width: "18px",
                        height: "18px",
                        cursor: "pointer",
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </main>

      <Navbar />

      {/* 모달 */}
      {showAddProjectModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowAddProjectModal(false)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "18px",
              padding: "32px 24px",
              width: "90%",
              maxWidth: "400px",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.3)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              style={{
                margin: "0 0 8px 0",
                fontSize: "20px",
                fontWeight: 900,
                color: "#111827",
                fontFamily: "var(--font-pixel-kr)",
                textAlign: "center",
              }}
            >
              프로젝트 추가하기
            </h2>
            <p
              style={{
                margin: "0 0 20px 0",
                fontSize: "14px",
                color: "#6b7280",
                fontFamily: "var(--font-sans)",
                textAlign: "center",
              }}
            >
              어떤 방식으로 하시겠습니까?
            </p>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              <button
                onClick={() => {
                  setShowAddProjectModal(false);
                  setShowAiPlanForm(true);
                  setAiPlanStep("form");
                }}
                style={{
                  width: "100%",
                  background: "#2A9699",
                  color: "#fff",
                  border: "none",
                  borderRadius: "12px",
                  padding: "14px",
                  fontSize: "14px",
                  fontWeight: 800,
                  cursor: "pointer",
                  fontFamily: "var(--font-pixel-kr)",
                }}
              >
                AI로 추가하기
              </button>
              <button
                onClick={() => setShowAddProjectModal(false)}
                style={{
                  width: "100%",
                  background: "#2A9699",
                  color: "#fff",
                  border: "none",
                  borderRadius: "12px",
                  padding: "14px",
                  fontSize: "14px",
                  fontWeight: 800,
                  cursor: "pointer",
                  fontFamily: "var(--font-pixel-kr)",
                }}
              >
                직접 추가하기
              </button>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <button
                  onClick={() => setShowAddProjectModal(false)}
                  style={{
                    width: "50%",
                    background: "#e5e7eb",
                    color: "#111827",
                    border: "none",
                    borderRadius: "12px",
                    padding: "10px",
                    fontSize: "12px",
                    fontWeight: 800,
                    cursor: "pointer",
                    fontFamily: "var(--font-pixel-kr)",
                  }}
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
