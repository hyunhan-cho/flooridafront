// src/pages/mycalendar/HomeMonthCalendar.jsx
import React from "react";

// ✅ MonthProjects.jsx의 buildMonthMatrix 로직 그대로
function buildMonthMatrix(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);

  // Monday-first index (Mon=0,...,Sun=6)
  const firstWeekday = (first.getDay() + 6) % 7;
  const totalDays = last.getDate();

  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

const weekdayLabels = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export default function HomeMonthCalendar({
  startDate, // "YYYY-MM-DD"
  endDate, // "YYYY-MM-DD"
  floors = [], // [{scheduledDate:"YYYY-MM-DD", ...}]
  accentColor, // string ex) "#f59768" or schedule.color
}) {
  const baseDate = React.useMemo(() => {
    if (startDate) return new Date(startDate);
    if (floors[0]?.scheduledDate) return new Date(floors[0].scheduledDate);
    return new Date();
  }, [startDate, floors]);

  const today = new Date();
  const cells = React.useMemo(() => buildMonthMatrix(baseDate), [baseDate]);

  const isToday = (d) =>
    d &&
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();

  const plannedDates = React.useMemo(() => {
    const set = new Set();
    const baseY = baseDate.getFullYear();
    const baseM = baseDate.getMonth();

    floors.forEach((f) => {
      if (!f?.scheduledDate) return;
      const d = new Date(f.scheduledDate);
      if (d.getFullYear() === baseY && d.getMonth() === baseM) {
        set.add(d.getDate());
      }
    });

    return set;
  }, [floors, baseDate, startDate, endDate]);

  const calendarStyle = React.useMemo(() => {
    // 캘린더 강조 색상 CSS 변수로 전달
    return accentColor ? { "--calendar-accent": accentColor } : undefined;
  }, [accentColor]);

  // 달력 헤더 내용 (피그마와 일치)
  const monthYearHeader = `${baseDate.getFullYear()}년 ${
    baseDate.getMonth() + 1
  }월`;

  return (
    <div className="home-month-calendar">
      {/* 💡 월/년도 헤더 추가 */}
      <div className="aiCalendarMonth">{monthYearHeader}</div>

      {/* ✅ MonthProjects와 동일한 클래스/구조 */}
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
    </div>
  );
}
