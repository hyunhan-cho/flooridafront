// src/pages/TeamCalendar.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import TeamHeader from "../components/TeamHeader.jsx";
import DirectAddForm from "./mycalendar/DirectAddForm.jsx";
import CalendarView from "../components/CalendarView.jsx";
import editIcon from "../assets/img/Vector.png";
import { AUTH_TOKEN_KEY } from "../config.js";
import {
  getSchedules,
  getSchedule,
  deleteSchedule,
  updateFloor,
  deleteFloor,
  getTeam,
} from "../services/api.js";

export default function TeamCalendar() {
  const navigate = useNavigate();
  const { teamId: teamIdParam } = useParams();
  const teamId = Number(teamIdParam);

  // ✅ role
  const [myRole, setMyRole] = useState(null);
  const isOwner = (myRole ?? "").toLowerCase() === "owner";

  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [showDirectAddForm, setShowDirectAddForm] = useState(false);

  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [editingFloor, setEditingFloor] = useState(null);
  const [editingFloorText, setEditingFloorText] = useState("");

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // ✅ owner 여부 로드
  useEffect(() => {
    const loadRole = async () => {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      if (!token || !Number.isFinite(teamId)) {
        setMyRole(null);
        return;
      }

      try {
        const team = await getTeam(teamId);
        setMyRole(team?.myRole ?? null);
      } catch (e) {
        if (e?.status === 401) return navigate("/login", { replace: true });
        setMyRole(null); // 못 불러오면 버튼 숨김
      }
    };

    loadRole();
  }, [teamId, navigate]);

  // ✅ 일정 목록 불러오기
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
        const convertedTasks = await Promise.all(
          data.map(async (schedule) => {
            let floors = schedule.floors || [];

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
              floorId: floor.floorId,
              scheduleId: schedule.scheduleId,
              text: floor.title || `단계 ${index + 1}`,
              done: !!floor.completed,
            }));

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
        setTasks([]);
      }
    } catch (error) {
      console.error("일정 로드 실패:", error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate]);

  const loadTasksForDate = async () => {
    await loadTasks();
  };

  // ✅ 일정 삭제
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

      if (selectedDate) await loadTasksForDate(selectedDate);
      else await loadTasks();
    } catch (error) {
      console.error("일정 삭제 실패:", error);
      alert("일정 삭제에 실패했습니다. 다시 시도해주세요.");
    }
  };

  // ✅ 직접 추가하기 폼
  if (showDirectAddForm) {
    return (
      <DirectAddForm
        onBack={() => setShowDirectAddForm(false)}
        onSuccess={async () => {
          setShowDirectAddForm(false);
          await loadTasks();
        }}
      />
    );
  }

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
          onTaskUpdate={async (updatedTasks) => setTasks(updatedTasks)}
          onFloorDelete={async (floorId) => {
            await deleteFloor(floorId);
            await loadTasks();
          }}
          onFloorUpdate={async (floorId, data) => {
            await updateFloor(floorId, data);
            await loadTasks();
          }}
          editIcon={editIcon}
          // (CalendarView 안에서 쓰고 있으면) 삭제 핸들러도 내려줘
          onDeleteSchedule={handleDeleteSchedule}
        />

        {/* ✅ owner만 보이게 */}
        {isOwner && (
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
        )}
      </main>

      <Navbar />
    </div>
  );
}
