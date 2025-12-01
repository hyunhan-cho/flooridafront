// pages/MyCalendar.jsx
import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar.jsx";
import PersonalHeader from "../components/PersonalHeader.jsx";
import AiPlanFormNew from "./mycalendar/AiPlanFormNew.jsx";
import AiPlanLoading from "./mycalendar/AiPlanLoading.jsx";
import AiPlanResult from "./mycalendar/AiPlanResult.jsx";
import { API_BASE_URL, AUTH_TOKEN_KEY } from "../config.js";
import { getSchedules, getSchedule } from "../services/api.js";

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

export default function MyCalendar() {
  const [currentDate, setCurrentDate] = useState(() => new Date()); //
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);
  const [showAiPlanForm, setShowAiPlanForm] = useState(false);
  const [aiPlanStep, setAiPlanStep] = useState("form"); // "form" | "loading" | "result"
  const [schedule, setSchedule] = useState(null);

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
                console.log(`Schedule ${schedule.scheduleId} 상세 정보:`, detail);
              } catch (err) {
                console.warn(`Schedule ${schedule.scheduleId} 상세 정보 로드 실패:`, err);
                floors = [];
              }
            }

            const subtasks = floors.map((floor, index) => ({
              id: floor.floorId || `sub-${schedule.scheduleId}-${index}`,
              text: floor.title || `단계 ${index + 1}`,
              done: false, // TODO: 실제 완료 상태를 API에서 가져와야 함
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
    loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate]);

  // ✅ AI 생성 일정을 메인 목록에 추가하는 핸들러
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
              return (
                <div
                  key={i}
                  style={{
                    aspectRatio: "1",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "14px",
                    fontWeight: 900,
                    color: d ? "#111827" : "transparent",
                    background: isTodayCell ? "#d1d5db" : "transparent",
                    borderRadius: isTodayCell ? "50%" : "8px",
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
                    onChange={() => {
                      const newTasks = tasks.map((t) => {
                        if (t.id !== task.id) return t;
                        const updatedSubtasks = t.subtasks.map((s) =>
                          s.id === subtask.id ? { ...s, done: !s.done } : s
                        );
                        const doneCount = updatedSubtasks.filter((s) => s.done).length;
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
