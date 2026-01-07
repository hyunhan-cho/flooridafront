// src/pages/TeamCalendar.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom"; // ✅ 추가
import Navbar from "../components/Navbar.jsx";
import TeamHeader from "../components/TeamHeader.jsx";
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

export default function TeamCalendar() {
  const navigate = useNavigate(); // ✅ 추가
  const { teamId: teamIdParam } = useParams(); // ✅ 추가
  const teamId = Number(teamIdParam); // ✅ 추가

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

  // 컴포넌트 마운트 시 및 currentDate 변경 시 일정 불러오기
  useEffect(() => {
    loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate]);

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

  // 메인 캘린더 화면
  return (
    <div className="app home-view">
      <TeamHeader />

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
              // ✅ SpecificTeamPlans로 이동 (teamId 유지)
              if (!Number.isFinite(teamId)) {
                alert("teamId가 없어서 이동할 수 없어요. 라우트 확인 필요!");
                return;
              }
              navigate(`/specificteamplans/${teamId}/`);
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
            세부 계획 생성하기
          </button>
        </div>
      </main>

      <Navbar />
    </div>
  );
}
