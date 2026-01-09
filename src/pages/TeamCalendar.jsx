// src/pages/TeamCalendar.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import TeamHeader from "../components/TeamHeader.jsx";
import TeamCalendarView from "../components/TeamCalendarView.jsx";
import TeamFloorEditPanel from "../components/TeamFloorEditPanel.jsx";
import editIcon from "../assets/img/Vector.png";

import { AUTH_TOKEN_KEY } from "../config.js";
import { getTeam, getTeamFloors } from "../services/api.js";

export default function TeamCalendar() {
  const navigate = useNavigate();
  const { teamId: teamIdParam } = useParams();
  const teamId = Number(teamIdParam);

  const [myRole, setMyRole] = useState(null);
  const isOwner = (myRole ?? "").toLowerCase() === "owner";

  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);

  // ✅ 토글 열림 상태
  const [editorOpen, setEditorOpen] = useState(false);

  // ✅ 실제로 편집할 task (패널에 넘길 task)
  const [editingTask, setEditingTask] = useState(null);

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // ✅ 수정하기 버튼 = 토글 (열려있고 같은 task면 닫기 / 아니면 열기)
  const ANIM_MS = 320;

  const handleEditRequest = (task) => {
    if (!task) return;

    const same = editingTask?.id === task.id;

    // 같은 일정이면 토글 닫기
    if (editorOpen && same) {
      setEditorOpen(false);
      return;
    }

    // 열려있는 상태에서 다른 일정 클릭: 닫고 -> 갈아끼우고 -> 다시 열기
    if (editorOpen && !same) {
      setEditorOpen(false);

      setTimeout(() => {
        setSelectedTask(task);
        setEditingTask(task);
        setEditorOpen(true);
      }, ANIM_MS);

      return;
    }

    // 닫혀 있으면 그냥 열기
    setSelectedTask(task);
    setEditingTask(task);
    setEditorOpen(true);
  };

  // owner 로드
  useEffect(() => {
    const loadRole = async () => {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      if (!token || !Number.isFinite(teamId)) return;

      try {
        const team = await getTeam(teamId);
        setMyRole(team?.myRole ?? null);
      } catch (e) {
        if (e?.status === 401) return navigate("/login", { replace: true });
        setMyRole(null);
      }
    };
    loadRole();
  }, [teamId, navigate]);

  // ✅ /api/teams/{teamId}/floors 응답의 title + dueDate 연결
  const loadTasks = async () => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    setLoading(true);

    if (!token || !Number.isFinite(teamId)) {
      setTasks([]);
      setLoading(false);
      return;
    }

    try {
      const data = await getTeamFloors(teamId); // { teamLevel, floors: [...] }
      const floors = Array.isArray(data?.floors) ? data.floors : [];

      const converted = floors.map((f, idx) => ({
        id: String(f.teamFloorId ?? `teamFloor-${idx}`), // ✅ teamFloorId
        teamId, // ✅ 패널에서 멤버 불러올 때 필요
        title: f.title ?? "제목 없음",
        dueDate: f.dueDate ?? null, // "YYYY-MM-DD"
        completed: !!f.completed,
        assigneeUserIds: Array.isArray(f.assigneeUserIds)
          ? f.assigneeUserIds
          : [],
        assignees: Array.isArray(f.assignees) ? f.assignees : [],
        color: "#FDBA74",
      }));

      setTasks(converted);
    } catch (e) {
      console.error("team floors 로드 실패:", e);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

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
          marginLeft: "calc(50% - 50vw)",
          marginRight: "calc(50% - 50vw)",
          paddingTop: 0,
        }}
      >
        <TeamCalendarView
          tasks={tasks}
          loading={loading}
          selectedDate={selectedDate}
          onDateSelect={(d) => {
            setSelectedDate(d);
            setSelectedTask(null);

            // ✅ 날짜 클릭하면 패널 닫기
            setEditorOpen(false);
            setEditingTask(null);
          }}
          selectedTask={selectedTask}
          onTaskSelect={(task) => {
            setSelectedTask(task);
            // ✅ row 클릭은 "선택"만, 패널 자동 오픈 없음
          }}
          editIcon={editIcon}
          onEditRequest={handleEditRequest} // ✅ 여기만 토글 함수로 연결
          canEdit={isOwner}
          panelOpen={editorOpen}
        />

        {/* ✅ 캘린더 아래 편집 패널 */}
        <TeamFloorEditPanel
          open={editorOpen}
          task={editingTask}
          onClose={() => {
            setEditorOpen(false);
            setEditingTask(null);
          }}
          onSaved={async () => {
            await loadTasks();
            setEditorOpen(false);
            setEditingTask(null);
          }}
        />

        {isOwner && (
          <div
            style={{
              display: "flex",
              gap: "12px",
              width: "100%",
              maxWidth: "var(--panel-width)",
              margin: "20px 16px",
            }}
          >
            <button
              onClick={() => navigate(`/specificteamplans/${teamId}/`)}
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
