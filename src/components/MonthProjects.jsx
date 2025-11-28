import React, { useMemo, useEffect, useState } from "react";
import { getSchedules, getSchedule } from "../services/api.js";
import { AUTH_TOKEN_KEY } from "../config.js";

function buildMonthMatrix(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  // Monday-first index (Mon=0,...,Sun=6)
  const firstWeekday = (first.getDay() + 6) % 7; // Sunday=0 -> 6, Monday=1 -> 0
  const totalDays = last.getDate();
  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(new Date(year, month, d));
  // fill to full weeks (rows of 7)
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

const weekdayLabels = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

// floors에서 날짜 추출 (예: floors 배열에서 날짜 정보 추출)
function extractPlannedDates(floors, currentMonth) {
  if (!Array.isArray(floors)) return [];
  const dates = [];
  floors.forEach((floor) => {
    if (floor.date) {
      const date = new Date(floor.date);
      if (date.getMonth() === currentMonth) {
        dates.push(date.getDate());
      }
    }
  });
  return dates;
}

export default function MonthProjects({ onProgressChange }) {
  const today = new Date();
  const cells = buildMonthMatrix(today);
  const currentMonth = today.getMonth();
  const isToday = (d) =>
    d &&
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();

  const [isTeamMode, setIsTeamMode] = useState(false);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);

  // 일정 목록 로드
  useEffect(() => {
    const loadSchedules = async () => {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        // 일정 목록 가져오기 (type 파라미터로 개인/팀 필터링)
        const type = isTeamMode ? "team" : "personal";
        const data = await getSchedules({ type });
        
        // API 응답을 프로젝트 형식으로 변환
        const convertedProjects = Array.isArray(data) ? data.map((schedule) => {
          const floors = schedule.floors || [];
          const plannedDates = extractPlannedDates(floors, currentMonth);
          
          return {
            id: schedule.id,
            text: schedule.title || schedule.name,
            color: schedule.color || "#f59768",
            plannedDates,
            type: schedule.type || (isTeamMode ? "team" : "personal"),
            scheduleData: schedule, // 원본 데이터 보관
          };
        }) : [];
        
        setSchedules(convertedProjects);
      } catch (error) {
        console.error("일정 로드 실패:", error);
        // 에러 발생 시 빈 배열로 설정
        setSchedules([]);
      } finally {
        setLoading(false);
      }
    };

    loadSchedules();
  }, [isTeamMode, currentMonth]);

  // 개인/팀 모드에 따라 프로젝트 필터링
  const projects = useMemo(() => {
    return schedules.filter((p) => {
      if (isTeamMode) {
        return p.type === "team";
      }
      return p.type === "personal";
    });
  }, [schedules, isTeamMode]);

  const [projectStates, setProjectStates] = useState({});

  const [activeProjectId, setActiveProjectId] = React.useState(null);

  // 프로그레스 계산
  const progress = useMemo(() => {
    const done = Object.values(projectStates).filter((s) => s.done).length;
    const total = projects.length;
    return total > 0 ? (done / total) * 100 : 0;
  }, [projectStates, projects.length]);

  // 프로그레스 변경 시 상위 컴포넌트에 전달
  React.useEffect(() => {
    const done = Object.values(projectStates).filter((s) => s.done).length;
    const total = projects.length;
    onProgressChange?.({ percent: progress, done, total });
  }, [progress, onProgressChange, projectStates, projects.length]);

  React.useEffect(() => {
    if (!projects.length) {
      setActiveProjectId(null);
      return;
    }
    if (!activeProjectId || !projects.some((project) => project.id === activeProjectId)) {
      setActiveProjectId(projects[0].id);
    }
  }, [projects, activeProjectId, isTeamMode]);

  const activeProject = React.useMemo(
    () => projects.find((project) => project.id === activeProjectId) ?? null,
    [projects, activeProjectId]
  );

  const plannedDates = React.useMemo(() => {
    if (!activeProject?.plannedDates?.length) return new Set();
    return new Set(activeProject.plannedDates);
  }, [activeProject]);


  const calendarStyle = React.useMemo(() => {
    if (!activeProject?.color) return undefined;
    // 프로젝트 색상을 약간 투명하게 만들어 배경색으로 사용
    const color = activeProject.color;
    // hex 색상을 rgba로 변환 (투명도 0.3)
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

  const handleQuestToggle = (projectId) => {
    setProjectStates((prev) => {
      const current = prev[projectId] ?? { done: false };
      return {
        ...prev,
        [projectId]: { ...current, done: !current.done },
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
              aria-label={isTeamMode ? "개인 모드로 전환" : "팀 모드로 전환"}
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

        <div className="month-grid" style={calendarStyle}>
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
            const state = projectStates[project.id] ?? {
              done: false,
            };
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
                  aria-pressed={state.done}
                  aria-label={`${project.text} 완료 여부`}
                >
                  <span className="project-checkbox-mark" />
                </button>
              </div>
            );
          })}
        </div>
    </section>
  );
}
