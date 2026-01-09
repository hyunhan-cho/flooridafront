// src/components/TeamCalendarView.jsx
import React, { useMemo, useState } from "react";

function buildMonthMatrix(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const firstWeekday = (first.getDay() + 6) % 7; // monday start
  const totalDays = last.getDate();

  const cells = [];
  for (let i = 1; i <= firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

const weekdayLabels = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function TeamCalendarView({
  tasks = [],
  loading = false,
  selectedDate,
  onDateSelect,
  selectedTask,
  onTaskSelect,
  editIcon,
  onEditRequest,
  canEdit = false, // owner일 때만 true
  panelOpen = false,
}) {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const today = new Date();
  const cells = useMemo(() => buildMonthMatrix(currentDate), [currentDate]);

  const isToday = (d) =>
    d &&
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();

  const monthYear = `${currentDate.getFullYear()}년 ${
    currentDate.getMonth() + 1
  }월`;

  const goToPrevMonth = () =>
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    );

  const goToNextMonth = () =>
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    );

  const handleDateClick = (d) => {
    if (!d) return;
    onDateSelect?.(d);
    onTaskSelect?.(null);
  };

  const targetYmd = formatDate(selectedDate || today);

  const tasksForDay = useMemo(() => {
    return (tasks || []).filter((t) => t?.dueDate === targetYmd);
  }, [tasks, targetYmd]);

  // ✅ 모든 할 일의 마감일(YYYY-MM-DD) Set
  const dueDateSet = useMemo(() => {
    const set = new Set();
    (tasks || []).forEach((t) => {
      if (t?.dueDate) set.add(t.dueDate);
    });
    return set;
  }, [tasks]);

  return (
    <div
      style={{
        background: "#e5e7eb",
        borderRadius: "18px",
        width: "100%",
        maxWidth: "var(--panel-width)",
        margin: "0 16px",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* 달력 */}
      <div style={{ marginBottom: "20px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "12px",
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

          <h3
            style={{
              margin: 0,
              fontSize: "16px",
              fontWeight: 900,
              color: "#111827",
              fontFamily: "var(--font-pixel-kr)",
            }}
          >
            {monthYear}
          </h3>

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
            color: "#111827",
            textTransform: "uppercase",
            background: "#d9dde3",
            borderRadius: "12px",
            padding: "6px 12px",
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
          }}
        >
          {cells.map((d, i) => {
            const isTodayCell = isToday(d);

            const isSelectedDate =
              selectedDate &&
              d &&
              selectedDate.getFullYear() === d.getFullYear() &&
              selectedDate.getMonth() === d.getMonth() &&
              selectedDate.getDate() === d.getDate();

            const ymd = d ? formatDate(d) : null;

            // ✅ 마감일 있는 날짜면 무조건 주황
            const hasDueTask = !!ymd && dueDateSet.has(ymd);

            return (
              <div
                key={i}
                onClick={() => handleDateClick(d)}
                style={{
                  aspectRatio: "1",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "14px",
                  fontWeight: 900,
                  color: d ? "#111827" : "transparent",
                  background: hasDueTask
                    ? "#FDBA74"
                    : isTodayCell
                    ? "#d1d5db"
                    : "transparent",
                  borderRadius: "50%",
                  cursor: d ? "pointer" : "default",
                  border: isSelectedDate
                    ? hasDueTask
                      ? "2px solid #F97316"
                      : "2px solid #111827"
                    : "none",
                  boxSizing: "border-box",
                }}
              >
                {d ? d.getDate() : ""}
              </div>
            );
          })}
        </div>
      </div>

      {/* 리스트 */}
      <div style={{ borderTop: "1px solid #d1d5db", paddingTop: "16px" }}>
        {loading ? (
          <div
            style={{
              textAlign: "center",
              padding: "20px",
              color: "#6b7280",
              fontFamily: "var(--font-pixel-kr)",
            }}
          >
            로딩 중...
          </div>
        ) : tasksForDay.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "20px",
              color: "#6b7280",
              fontFamily: "var(--font-pixel-kr)",
            }}
          >
            등록된 계획이 없습니다.
          </div>
        ) : (
          tasksForDay.map((task) => {
            const isSelected = selectedTask?.id === task.id;

            return (
              <div key={task.id} style={{ marginBottom: "8px" }}>
                <div
                  onClick={() => {
                    onTaskSelect?.(isSelected ? null : task);

                    // ✅ 핵심: 방장만 패널 열리게
                    if (canEdit) onEditRequest?.(task);
                  }}
                  style={{
                    background: canEdit
                      ? isSelected
                        ? "#FDBA74"
                        : "#f3f4f6"
                      : "#FDBA74",
                    borderRadius: "8px",
                    padding: "10px 12px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    cursor: "pointer",
                    gap: "8px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "clamp(10px, 2.5vw, 14px)",
                      fontWeight: 600,
                      color: "#111827",
                      flex: 1,
                      minWidth: 0,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                    title={task.title}
                  >
                    {task.title}
                  </span>

                  {/* owner만 수정 버튼 보임 */}
                  {canEdit && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onTaskSelect?.(task);
                        onEditRequest?.(task);
                      }}
                      style={{
                        background: "#e5e7eb",
                        border: "none",
                        borderRadius: "8px",
                        color: "#111827",
                        fontSize: "12px",
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        padding: "6px 12px",
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                      }}
                    >
                      {editIcon ? (
                        <img
                          src={editIcon}
                          alt="수정"
                          style={{ width: "14px", height: "14px" }}
                        />
                      ) : null}
                      <span>수정하기</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
