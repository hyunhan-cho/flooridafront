import React from "react";

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

const defaultProjects = [
  {
    id: "project-toefl",
    text: "TOEFL 교재 끝내기",
    color: "#f59768",
    plannedDates: [10, 11, 12],
  },
  {
    id: "project-data",
    text: "빅데이터 개인 프로젝트",
    color: "#22c7d5",
    plannedDates: [13, 14, 15, 16],
  },
  {
    id: "project-home-training",
    text: "기상 직후 홈트 30분",
    color: "#f8cf4b",
    plannedDates: [10, 11, 12, 13, 14, 15, 16],
  },
];

export default function MonthProjects() {
  const today = new Date();
  const cells = buildMonthMatrix(today);
  const isToday = (d) =>
    d &&
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();

  const projects = defaultProjects;

  const [activeProjectId, setActiveProjectId] = React.useState(
    () => projects[0]?.id ?? null
  );

  React.useEffect(() => {
    if (!projects.length) return;
    if (!projects.some((project) => project.id === activeProjectId)) {
      setActiveProjectId(projects[0].id);
    }
  }, [projects, activeProjectId]);

  const activeProject = React.useMemo(
    () => projects.find((project) => project.id === activeProjectId) ?? null,
    [projects, activeProjectId]
  );

  const plannedDates = React.useMemo(() => {
    if (!activeProject?.plannedDates?.length) return new Set();
    return new Set(activeProject.plannedDates);
  }, [activeProject]);

  const calendarStyle = React.useMemo(
    () =>
      activeProject?.color
        ? { "--calendar-accent": activeProject.color }
        : undefined,
    [activeProject]
  );

  return (
    <section className="card card-month">
      <h2 className="card-title month-title">이번 달의 프로젝트</h2>

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
          return (
            <div
              key={i}
              className={
                "day" +
                (isToday(d) ? " today" : "") +
                (isPlanned ? " planned" : "")
              }
            >
              {d ? <span className="day-num">{d.getDate()}</span> : ""}
            </div>
          );
        })}
      </div>

      <div className="project-list">
        {projects.map((project) => {
          const isActive = project.id === activeProjectId;
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
            </div>
          );
        })}
      </div>
    </section>
  );
}
