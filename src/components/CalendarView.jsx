// src/components/CalendarView.jsx
import React, { useState } from "react";

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

// startDate ~ endDate 사이에서, "현재 달"에 해당하는 일(day)만 뽑기
function extractPlannedDatesFromRange(startDateStr, endDateStr, year, month) {
  if (!startDateStr || !endDateStr) return [];

  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  if (isNaN(start) || isNaN(end)) return [];

  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);

  // 해당 월과 겹치는 구간으로 클램프
  const from = start > monthStart ? start : monthStart;
  const to = end < monthEnd ? end : monthEnd;

  if (from > to) return [];

  const result = [];
  const cursor = new Date(from);
  while (cursor <= to) {
    result.push(cursor.getDate()); // day number
    cursor.setDate(cursor.getDate() + 1);
  }
  return result;
}

// 날짜를 YYYY-MM-DD 형식으로 변환
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function CalendarView({
  tasks = [],
  loading = false,
  selectedDate,
  onDateSelect,
  selectedTask,
  onTaskSelect,
  editingTask,
  onEditingTaskChange,
  editingFloor,
  onEditingFloorChange,
  editingFloorText,
  onEditingFloorTextChange,
  onTaskUpdate,
  onFloorDelete,
  onFloorUpdate,
  editIcon,
}) {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const today = new Date();

  const cells = buildMonthMatrix(currentDate);
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

  const handleDateClick = (d) => {
    if (d) {
      onDateSelect?.(d);
      onTaskSelect?.(null);
      onEditingTaskChange?.(null);
      onEditingFloorChange?.(null);
      onEditingFloorTextChange?.("");
    }
  };

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
      {/* 달력 섹션 */}
      <div
        style={{
          marginBottom: "20px",
        }}
      >
        {/* 월/년 헤더 */}
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

        {/* 요일 표시 */}
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

        {/* 날짜 그리드 */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: "8px",
          }}
        >
          {cells.map((d, i) => {
            const isTodayCell = isToday(d);
            const isSelected =
              selectedDate &&
              d &&
              selectedDate.getFullYear() === d.getFullYear() &&
              selectedDate.getMonth() === d.getMonth() &&
              selectedDate.getDate() === d.getDate();

            // 선택된 작업의 날짜 범위인지 확인
            let isInSelectedTaskRange = false;

            if (
              selectedTask &&
              d &&
              selectedTask.startDate &&
              selectedTask.endDate
            ) {
              const year = currentDate.getFullYear();
              const month = currentDate.getMonth();
              const plannedDates = extractPlannedDatesFromRange(
                selectedTask.startDate,
                selectedTask.endDate,
                year,
                month
              );
              isInSelectedTaskRange = plannedDates.includes(d.getDate());
            }

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
                  background: isSelected
                    ? "#9ca3af"
                    : isInSelectedTaskRange
                    ? selectedTask?.color || "#FDBA74"
                    : isTodayCell
                    ? "#d1d5db"
                    : "transparent",
                  borderRadius: "50%",
                  cursor: d ? "pointer" : "default",
                  transition: "background-color 0.2s ease",
                  border:
                    isSelected && isInSelectedTaskRange
                      ? "2px solid #000"
                      : "none",
                  boxSizing: "border-box",
                }}
                onMouseEnter={(e) => {
                  if (
                    d &&
                    !isSelected &&
                    !isTodayCell &&
                    !isInSelectedTaskRange
                  ) {
                    e.currentTarget.style.backgroundColor = "#e5e7eb";
                  }
                }}
                onMouseLeave={(e) => {
                  if (
                    d &&
                    !isSelected &&
                    !isTodayCell &&
                    !isInSelectedTaskRange
                  ) {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }
                }}
              >
                {d ? d.getDate() : ""}
              </div>
            );
          })}
        </div>
      </div>

      {/* 작업 목록 */}
      <div
        style={{
          borderTop: "1px solid #d1d5db",
          paddingTop: "16px",
        }}
      >
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
        ) : (
          (() => {
            // 날짜 필터링: selectedDate가 있으면 해당 날짜, 없으면 오늘 날짜
            const targetDate = selectedDate || today;
            const filteredTasks = tasks.filter((task) => {
              if (task.startDate && task.endDate) {
                const targetDateStr = formatDate(targetDate);
                const startDate = new Date(task.startDate);
                const endDate = new Date(task.endDate);
                const target = new Date(targetDateStr);

                startDate.setHours(0, 0, 0, 0);
                endDate.setHours(23, 59, 59, 999);
                target.setHours(0, 0, 0, 0);

                return target >= startDate && target <= endDate;
              }
              return false;
            });

            if (filteredTasks.length === 0) {
              return (
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
              );
            }

            // 각 task에서 해당 날짜에 해당하는 특정 subtask만 표시 (하루에 하나씩)
            const dailySubtasks = [];
            filteredTasks.forEach((task) => {
              if (
                task.subtasks &&
                task.subtasks.length > 0 &&
                task.startDate &&
                task.endDate
              ) {
                // 선택된 날짜가 startDate로부터 몇 번째 날인지 계산
                const targetDate = selectedDate || today;
                const targetDateStr = formatDate(targetDate);
                const startDate = new Date(task.startDate);
                const target = new Date(targetDateStr);

                startDate.setHours(0, 0, 0, 0);
                target.setHours(0, 0, 0, 0);

                // 날짜 차이 계산 (0-based 인덱스)
                const daysDiff = Math.floor(
                  (target - startDate) / (1000 * 60 * 60 * 24)
                );

                // 해당 날짜에 맞는 subtask 선택
                if (daysDiff >= 0 && daysDiff < task.subtasks.length) {
                  const targetSubtask = task.subtasks[daysDiff];
                  dailySubtasks.push({
                    ...targetSubtask,
                    taskId: task.id,
                    taskTitle: task.title,
                    taskColor: task.color,
                    scheduleId: task.id,
                  });
                } else if (daysDiff >= 0 && task.subtasks.length > 0) {
                  // 날짜가 범위를 벗어났지만 subtasks가 있으면 마지막 subtask 표시
                  const lastSubtask = task.subtasks[task.subtasks.length - 1];
                  dailySubtasks.push({
                    ...lastSubtask,
                    taskId: task.id,
                    taskTitle: task.title,
                    taskColor: task.color,
                    scheduleId: task.id,
                  });
                }
              } else if (task.subtasks && task.subtasks.length > 0) {
                // startDate/endDate 정보가 없으면 첫 번째 subtask 표시
                const firstSubtask = task.subtasks[0];
                dailySubtasks.push({
                  ...firstSubtask,
                  taskId: task.id,
                  taskTitle: task.title,
                  taskColor: task.color,
                  scheduleId: task.id,
                });
              }
            });

            if (dailySubtasks.length === 0) {
              return (
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
              );
            }

            return dailySubtasks.map((subtask) => {
              const isSelected =
                selectedTask && selectedTask.id === subtask.taskId;
              const parentTask = filteredTasks.find(
                (t) => t.id === subtask.taskId
              );
              const isExpanded = editingTask?.id === parentTask?.id;

              return (
                <div key={subtask.id}>
                  <div
                    onClick={() => {
                      if (parentTask) {
                        onTaskSelect?.(isSelected ? null : parentTask);
                      }
                    }}
                    style={{
                      background: isSelected
                        ? parentTask?.color || "#FDBA74"
                        : "#f3f4f6",
                      borderRadius: "8px",
                      padding: "10px 12px",
                      marginBottom: "8px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      cursor: "pointer",
                      transition: "background-color 0.2s ease",
                      gap: "8px",
                      flexWrap: "nowrap",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "clamp(10px, 2.5vw, 14px)",
                        fontWeight: 600,
                        color: "#111827",
                        fontFamily: "var(--font-sans)",
                        flex: "1",
                        minWidth: 0,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                      }}
                    >
                      {subtask.text}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (parentTask) {
                          onTaskSelect?.(parentTask);
                          onEditingTaskChange?.(isExpanded ? null : parentTask);
                        }
                      }}
                      style={{
                        background: "#e5e7eb",
                        border: "none",
                        borderRadius: "8px",
                        color: "#111827",
                        fontSize: "12px",
                        fontWeight: 600,
                        cursor: "pointer",
                        fontFamily: "var(--font-sans)",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        padding: "6px 12px",
                        flexShrink: 0,
                        whiteSpace: "nowrap",
                      }}
                    >
                      <img
                        src={editIcon}
                        alt="수정"
                        style={{
                          width: "14px",
                          height: "14px",
                          flexShrink: 0,
                        }}
                      />
                      <span>수정하기</span>
                      <span
                        style={{
                          fontSize: "12px",
                          color: "#6b7280",
                          transform: isExpanded
                            ? "rotate(180deg)"
                            : "rotate(0deg)",
                          transition: "transform 0.2s ease",
                          marginLeft: "4px",
                          flexShrink: 0,
                        }}
                      >
                        ▼
                      </span>
                    </button>
                  </div>

                  {/* 토글된 세부 계획 목록 */}
                  {isExpanded && parentTask && parentTask.subtasks && (
                    <div
                      style={{
                        background: "#ffffff",
                        borderRadius: "12px",
                        padding: "12px",
                        marginBottom: "8px",
                        marginTop: "8px",
                        border: "1px solid #e5e7eb",
                      }}
                    >
                      {/* 메인 타이틀 표시 */}
                      <div
                        style={{
                          padding: "12px",
                          marginBottom: "12px",
                          background: "#f9fafb",
                          borderRadius: "8px",
                          border: `2px solid ${parentTask.color || "#FDBA74"}`,
                        }}
                      >
                        <span
                          style={{
                            fontSize: "16px",
                            fontWeight: 700,
                            color: "#111827",
                            fontFamily: "var(--font-sans)",
                          }}
                        >
                          {parentTask.title}
                        </span>
                      </div>

                      {parentTask.subtasks.map((detailSubtask, index) => {
                        // startDate부터 시작해서 각 subtask의 날짜 계산
                        let taskDate = null;
                        if (parentTask.startDate) {
                          taskDate = new Date(parentTask.startDate);
                          taskDate.setDate(taskDate.getDate() + index);
                        }

                        const weekdays = [
                          "일",
                          "월",
                          "화",
                          "수",
                          "목",
                          "금",
                          "토",
                        ];
                        const weekday = taskDate
                          ? weekdays[taskDate.getDay()]
                          : "";
                        const month = taskDate ? taskDate.getMonth() + 1 : 0;
                        const day = taskDate ? taskDate.getDate() : 0;

                        return (
                          <div
                            key={detailSubtask.id}
                            style={{
                              background: "#f3f4f6",
                              borderRadius: "8px",
                              padding: "10px 12px",
                              marginBottom: "8px",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "4px",
                              }}
                            >
                              {taskDate && (
                                <span
                                  style={{
                                    fontSize: "14px",
                                    fontWeight: 600,
                                    color: "#111827",
                                    fontFamily: "var(--font-sans)",
                                  }}
                                >
                                  {month}/{day}({weekday})
                                </span>
                              )}
                              {editingFloor === detailSubtask.id ? (
                                <input
                                  type="text"
                                  value={editingFloorText}
                                  onChange={(e) =>
                                    onEditingFloorTextChange?.(e.target.value)
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                    }
                                  }}
                                  style={{
                                    fontSize: "12px",
                                    fontWeight: 500,
                                    color: "#374151",
                                    fontFamily: "var(--font-sans)",
                                    background: "#ffffff",
                                    border: "1px solid #d1d5db",
                                    borderRadius: "6px",
                                    padding: "4px 8px",
                                    width: "100%",
                                    maxWidth: "300px",
                                  }}
                                  autoFocus
                                />
                              ) : (
                                <span
                                  style={{
                                    fontSize: "12px",
                                    fontWeight: 500,
                                    color: "#374151",
                                    fontFamily: "var(--font-sans)",
                                  }}
                                >
                                  {detailSubtask.text}
                                </span>
                              )}
                            </div>
                            {editingFloor === detailSubtask.id ? (
                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "4px",
                                  alignItems: "flex-end",
                                  flexShrink: 0,
                                }}
                              >
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    if (
                                      window.confirm(
                                        "이 세부 계획을 삭제하시겠습니까? 삭제된 계획은 복구할 수 없습니다."
                                      )
                                    ) {
                                      try {
                                        await onFloorDelete?.(detailSubtask.id);
                                        onEditingFloorChange?.(null);
                                        onEditingFloorTextChange?.("");
                                      } catch (error) {
                                        console.error(
                                          "세부 계획 삭제 실패:",
                                          error
                                        );
                                        const errorMessage =
                                          error.status === 500
                                            ? "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
                                            : error.data?.message ||
                                              error.message ||
                                              "세부 계획 삭제에 실패했습니다.";
                                        alert(errorMessage);
                                      }
                                    }
                                  }}
                                  style={{
                                    background: "#ef4444",
                                    border: "none",
                                    borderRadius: "6px",
                                    padding: "4px 12px",
                                    fontSize: "clamp(9px, 2vw, 11px)",
                                    fontWeight: 600,
                                    color: "#fff",
                                    cursor: "pointer",
                                    fontFamily: "var(--font-sans)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                    whiteSpace: "nowrap",
                                    width: "100%",
                                    minWidth: "60px",
                                  }}
                                >
                                  ✕
                                </button>
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    try {
                                      await onFloorUpdate?.(detailSubtask.id, {
                                        title: editingFloorText,
                                      });
                                      onEditingFloorChange?.(null);
                                      onEditingFloorTextChange?.("");
                                    } catch (error) {
                                      console.error("계획 수정 실패:", error);
                                      alert("계획 수정에 실패했습니다.");
                                    }
                                  }}
                                  style={{
                                    background: "var(--brand-teal)",
                                    border: "none",
                                    borderRadius: "6px",
                                    padding: "4px 12px",
                                    fontSize: "clamp(9px, 2vw, 11px)",
                                    fontWeight: 600,
                                    color: "#fff",
                                    cursor: "pointer",
                                    fontFamily: "var(--font-sans)",
                                    whiteSpace: "nowrap",
                                    flexShrink: 0,
                                    width: "100%",
                                    minWidth: "60px",
                                  }}
                                >
                                  완료
                                </button>
                              </div>
                            ) : (
                              <img
                                src={editIcon}
                                alt="수정"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEditingFloorChange?.(detailSubtask.id);
                                  onEditingFloorTextChange?.(
                                    detailSubtask.text
                                  );
                                }}
                                style={{
                                  width: "14px",
                                  height: "14px",
                                  cursor: "pointer",
                                }}
                              />
                            )}
                          </div>
                        );
                      })}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "flex-end",
                          marginTop: "12px",
                        }}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditingTaskChange?.(null);
                          }}
                          style={{
                            width: "33.33%",
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
                          수정 완료
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            });
          })()
        )}
      </div>
    </div>
  );
}
