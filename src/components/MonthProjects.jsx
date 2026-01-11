import React, { useMemo, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSchedules } from "../services/api.js";
import { AUTH_TOKEN_KEY } from "../config.js";
import CoinPopup from "./CoinPopup.jsx"; // 코인 팝업 임포트

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

function extractPlannedDatesFromRange(startDateStr, endDateStr, year, month) {
  if (!startDateStr || !endDateStr) return [];
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  if (isNaN(start) || isNaN(end)) return [];

  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);
  const from = start > monthStart ? start : monthStart;
  const to = end < monthEnd ? end : monthEnd;
  if (from > to) return [];

  const result = [];
  const cursor = new Date(from);
  while (cursor <= to) {
    result.push(cursor.getDate());
    cursor.setDate(cursor.getDate() + 1);
  }
  return result;
}

export default function MonthProjects({
  onProgressChange,
  onProjectCountChange,
}) {
  const navigate = useNavigate();
  const today = new Date();
  const cells = buildMonthMatrix(today);
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();

  const isToday = (d) =>
    d &&
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();

  const [isTeamMode, setIsTeamMode] = useState(false);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);

  // [추가] 퀘스트 완료 시 띄울 코인 팝업 상태
  const [showQuestCoin, setShowQuestCoin] = useState(false);

  useEffect(() => {
    const loadSchedules = async () => {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      if (!token) {
        setLoading(false);
        setSchedules([]);
        return;
      }

      try {
        const data = await getSchedules({
          year: currentYear,
          month: currentMonth + 1,
        });

        const convertedProjects = Array.isArray(data)
          ? data.map((schedule) => {
              const plannedDates = extractPlannedDatesFromRange(
                schedule.startDate,
                schedule.endDate,
                currentYear,
                currentMonth
              );
              return {
                id: schedule.scheduleId,
                text: schedule.title || "",
                color: schedule.color || "#f59768",
                plannedDates,
                type: "personal",
                scheduleData: schedule,
              };
            })
          : [];
        setSchedules(convertedProjects);
      } catch (error) {
        console.error("일정 로드 실패:", error);
        setSchedules([]);
      } finally {
        setLoading(false);
      }
    };
    loadSchedules();
  }, [currentYear, currentMonth, isTeamMode]);

  useEffect(() => {
    onProjectCountChange?.(schedules.length);
  }, [schedules.length, onProjectCountChange]);

  const projects = useMemo(() => schedules, [schedules, isTeamMode]);
  const [projectStates, setProjectStates] = useState({});
  const [activeProjectId, setActiveProjectId] = useState(null);

  const progress = useMemo(() => {
    const done = Object.values(projectStates).filter((s) => s.done).length;
    const total = projects.length;
    return total > 0 ? (done / total) * 100 : 0;
  }, [projectStates, projects.length]);

  useEffect(() => {
    const done = Object.values(projectStates).filter((s) => s.done).length;
    const total = projects.length;
    onProgressChange?.({ percent: progress, done, total });
  }, [progress, onProgressChange, projectStates, projects.length]);

  useEffect(() => {
    if (!projects.length) {
      setActiveProjectId(null);
      return;
    }
    if (!activeProjectId || !projects.some((p) => p.id === activeProjectId)) {
      setActiveProjectId(projects[0].id);
    }
  }, [projects, activeProjectId]);

  const activeProject = useMemo(
    () => projects.find((p) => p.id === activeProjectId) ?? null,
    [projects, activeProjectId]
  );

  const plannedDates = useMemo(() => {
    if (!activeProject?.plannedDates?.length) return new Set();
    return new Set(activeProject.plannedDates);
  }, [activeProject]);

  const calendarStyle = useMemo(() => {
    if (!activeProject?.color) return undefined;
    const color = activeProject.color;
    const hexToRgba = (hex, alpha) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };
    return {
      "--calendar-accent": color,
      "--calendar-fill": hexToRgba(color, 0.3),
    };
  }, [activeProject]);

  // [수정] 체크박스 토글 시 코인 팝업 로직
  const handleQuestToggle = (projectId) => {
    setProjectStates((prev) => {
      const current = prev[projectId] ?? { done: false };
      const nextDone = !current.done;

      // '미완료' -> '완료' 로 바뀔 때만 팝업 표시
      if (nextDone) {
        setShowQuestCoin(true);
      }

      return {
        ...prev,
        [projectId]: { ...current, done: nextDone },
      };
    });
  };

  return (
    <section className="card card-month">
      <div className="month-header">
      <h2 className="card-title month-title">이번 달의 프로젝트</h2>
        <div className="month-toggle-wrapper">
          <button
            type="button"
            className={`month-toggle ${isTeamMode ? "month-toggle--team" : ""}`}
            onClick={() => setIsTeamMode(!isTeamMode)}
          >
            {!isTeamMode && <span className="month-toggle-label">개인</span>}
            {isTeamMode && <span className="month-toggle-label">팀</span>}
            <span className="month-toggle-handle" />
          </button>
        </div>
      </div>

      <div className="month-weekdays">
        {weekdayLabels.map((lb) => (
          <span key={lb} className="month-wd">
            {lb}
          </span>
        ))}
      </div>

      <div
        className="month-grid"
        onClick={() => navigate("/mycalendar")}
        style={{ ...calendarStyle, cursor: "pointer" }}
      >
        {cells.map((d, i) => {
          const isPlanned = d ? plannedDates.has(d.getDate()) : false;
          const dayClasses = [
            "day",
            isToday(d) ? "today" : "",
            isPlanned ? "planned" : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <div key={i} className={dayClasses}>
              {d ? <span className="day-num">{d.getDate()}</span> : ""}
            </div>
          );
        })}
      </div>

      <div className="project-list">
        {projects.map((project) => {
          const isActive = project.id === activeProjectId;
          const state = projectStates[project.id] ?? { done: false };

          return (
            <div
              key={project.id}
              className={`project-item ${isActive ? "active" : ""}`}
              style={
                isActive
                  ? {
                      borderColor: project.color,
                      boxShadow: `0 0 0 3px ${project.color}33`,
                      background: `${project.color}1a`,
                    }
                  : undefined
              }
            >
              <button
                type="button"
                className="project-select"
                onClick={() => setActiveProjectId(project.id)}
              >
                <span className="project-title">{project.text}</span>
              </button>
              <button
                type="button"
                className={`project-checkbox${
                  state.done ? " project-checkbox--checked" : ""
                }`}
                onClick={(evt) => {
                  evt.stopPropagation();
                  handleQuestToggle(project.id);
                }}
              >
                <span className="project-checkbox-mark" />
              </button>
            </div>
          );
        })}
      </div>

      {/* [추가] 퀘스트 완료 시 10코인 팝업 */}
      {showQuestCoin && (
        <CoinPopup coinAmount={10} onClose={() => setShowQuestCoin(false)} />
      )}
    </section>
  );
}
