// pages/공유용캘린더.jsx
import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar.jsx";
import PersonalHeader from "../components/PersonalHeader.jsx";
import AiPlanFormNew from "./mycalendar/AiPlanFormNew.jsx";
import AiPlanLoading from "./mycalendar/AiPlanLoading.jsx";
import AiPlanResult from "./mycalendar/AiPlanResult.jsx";
import DirectAddForm from "./mycalendar/DirectAddForm.jsx";
import CalendarView from "../components/CalendarView.jsx";
import { API_BASE_URL, AUTH_TOKEN_KEY } from "../config.js";
import editIcon from "../assets/img/Vector.png";
import {
  getSchedules,
  getSchedule,
  getFloorsStatusByDate,
  deleteSchedule,
  updateFloorCompletion,
  updateFloor,
  deleteFloor,
} from "../services/api.js";

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

export default function 공유용캘린더() {
  const [currentDate, setCurrentDate] = useState(() => new Date()); //
  const [showAiPlanForm, setShowAiPlanForm] = useState(false);
  const [aiPlanStep, setAiPlanStep] = useState("form"); // "form" | "loading" | "result"
  const [schedule, setSchedule] = useState(null);
  const [showDirectAddForm, setShowDirectAddForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null); // 선택된 날짜
  const [selectedTask, setSelectedTask] = useState(null); // 선택된 작업
  const [editingTask, setEditingTask] = useState(null); // 수정 중인 작업
  const [editingFloor, setEditingFloor] = useState(null); // 편집 중인 floor (id)
  const [editingFloorText, setEditingFloorText] = useState(""); // 편집 중인 floor의 텍스트

  // 2. tasks를 상태(State)로 선언해야 화면이 업데이트됩니다.
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // 선택된 날짜의 할 일 불러오기 (모든 floors를 가져온 후 날짜에 맞는 것만 필터링)
  const loadTasksForDate = async (date) => {
    // 항상 loadTasks를 사용해서 모든 floors를 가져옴
    await loadTasks();
  };

  // API에서 일정 목록 불러오기
  const loadTasks = async (targetDate = null) => {
    const dateToUse = targetDate || new Date();
    const year = dateToUse.getFullYear();
    const month = dateToUse.getMonth() + 1;
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
              startDate: schedule.startDate,
              endDate: schedule.endDate,
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

  // 컴포넌트 마운트 시 일정 불러오기
  useEffect(() => {
    loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // AI 생성 일정을 메인 목록에 추가하는 핸들러
  const handleConfirmAiSchedule = async () => {
    if (!schedule) return;

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

  // 직접 추가하기 폼 화면
  if (showDirectAddForm) {
    return (
      <DirectAddForm
        onBack={() => setShowDirectAddForm(false)}
        onSuccess={async (data) => {
          setShowDirectAddForm(false);
          await loadTasks();
        }}
      />
    );
  }

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
        {/* 달력과 작업 목록 컨테이너 */}
        <CalendarView
          tasks={tasks}
          loading={loading}
          selectedDate={selectedDate}
          onDateSelect={(date) => {
            setSelectedDate(date);
            setSelectedTask(null);
            setEditingTask(null);
            setEditingFloor(null);
            setEditingFloorText("");
          }}
          selectedTask={selectedTask}
          onTaskSelect={setSelectedTask}
          editingTask={editingTask}
          onEditingTaskChange={setEditingTask}
          editingFloor={editingFloor}
          onEditingFloorChange={setEditingFloor}
          editingFloorText={editingFloorText}
          onEditingFloorTextChange={setEditingFloorText}
          onTaskUpdate={async (updatedTasks) => {
            setTasks(updatedTasks);
          }}
          onFloorDelete={async (floorId) => {
            await deleteFloor(floorId);
            await loadTasks();
          }}
          onFloorUpdate={async (floorId, data) => {
            await updateFloor(floorId, data);
            await loadTasks();
          }}
          editIcon={editIcon}
        />

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
            onClick={() => {
              setShowAiPlanForm(true);
              setAiPlanStep("form");
            }}
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
            AI로 추가하기
          </button>
          <button
            onClick={() => {
              setShowDirectAddForm(true);
            }}
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
            직접 추가하기
          </button>
        </div>
      </main>

      <Navbar />
    </div>
  );
}
