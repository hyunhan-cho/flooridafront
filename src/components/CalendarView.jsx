// src/components/CalendarView.jsx
import React, { useState } from "react";
import "./TaskListSection.css"; // 페이지네이션 CSS 재사용

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

  // [FIX] 시간 오차로 인한 마지막 날 누락 방지 (00:00:00 초기화)
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  const monthStart = new Date(year, month, 1);
  monthStart.setHours(0, 0, 0, 0);

  const monthEnd = new Date(year, month + 1, 0);
  monthEnd.setHours(0, 0, 0, 0);

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
  onScheduleDelete,
  onFloorAdd,
  onScheduleUpdate,
  onScheduleRefresh,
  editIcon,
}) {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState(null);
  const [taskPage, setTaskPage] = useState(0); // ✅ 페이지네이션 상태
  const [subtaskPage, setSubtaskPage] = useState(0);
  const SUBTASKS_PER_PAGE = 5;
  const today = new Date();

  const cells = buildMonthMatrix(currentDate);
  const isToday = (d) =>
    d &&
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();

  const monthYear = `${currentDate.getFullYear()}년 ${currentDate.getMonth() + 1
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

            // ✅ 페이지네이션 로직
            const ITEMS_PER_PAGE = 3;
            const totalPages = Math.ceil(filteredTasks.length / ITEMS_PER_PAGE);
            // taskPage가 범위를 벗어나면 리셋
            const currentPage = Math.min(taskPage, totalPages - 1);
            const startIdx = currentPage * ITEMS_PER_PAGE;
            const paginatedTasks = filteredTasks.slice(startIdx, startIdx + ITEMS_PER_PAGE);

            const goToPrevPage = () => setTaskPage((p) => Math.max(0, p - 1));
            const goToNextPage = () => setTaskPage((p) => Math.min(totalPages - 1, p + 1));

            return (
              <>
                {paginatedTasks.map((task) => {
                  const isSelected = selectedTask && selectedTask.id === task.id;
                  const isExpanded = editingTask?.id === task.id;

                  // 선택된 날짜가 startDate로부터 몇 번째 날인지 계산
                  const targetDate = selectedDate || today;
                  const targetDateStr = formatDate(targetDate);
                  let todaySubtask = null;

                  if (task.startDate && task.subtasks && task.subtasks.length > 0) {
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
                      todaySubtask = task.subtasks[daysDiff];
                    } else if (daysDiff >= 0 && task.subtasks.length > 0) {
                      // 날짜가 범위를 벗어났지만 subtasks가 있으면 마지막 subtask 표시
                      todaySubtask = task.subtasks[task.subtasks.length - 1];
                    } else if (task.subtasks.length > 0) {
                      // startDate/endDate 정보가 없으면 첫 번째 subtask 표시
                      todaySubtask = task.subtasks[0];
                    }
                  }

                  return (
                    <div key={task.id}>
                      <div
                        onClick={() => {
                          onTaskSelect?.(isSelected ? null : task);
                          // 계획 클릭 시 바로 토글 열기/닫기
                          onEditingTaskChange?.(isExpanded ? null : task);
                          setSubtaskPage(0);
                        }}
                        style={{
                          background: isSelected
                            ? task.color || "#FDBA74"
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
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "4px",
                            flex: "1",
                            minWidth: 0,
                          }}
                        >
                          <span
                            style={{
                              fontSize: "clamp(12px, 2.5vw, 16px)",
                              fontWeight: 700,
                              color: "#111827",
                              fontFamily: "var(--font-sans)",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {task.title}
                          </span>
                          {todaySubtask && (
                            <span
                              style={{
                                fontSize: "clamp(10px, 2.5vw, 12px)",
                                fontWeight: 500,
                                color: "#6b7280",
                                fontFamily: "var(--font-sans)",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {todaySubtask.text}
                            </span>
                          )}
                        </div>
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
                      </div>

                      {/* 토글된 세부 계획 목록 */}
                      {isExpanded && task && task.subtasks && (
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
                          {(() => {
                            const subtasks = task.subtasks || [];
                            const totalSubPages = Math.ceil(
                              subtasks.length / SUBTASKS_PER_PAGE
                            );
                            const currentSubPage =
                              subtaskPage >= totalSubPages ? 0 : subtaskPage;
                            const startIdx = currentSubPage * SUBTASKS_PER_PAGE;
                            const currentSubtasks = subtasks.slice(
                              startIdx,
                              startIdx + SUBTASKS_PER_PAGE
                            );

                            return (
                              <>
                                {currentSubtasks.map((detailSubtask, i) => {
                                  const index = startIdx + i;
                                  // startDate부터 시작해서 각 subtask의 날짜 계산
                                  let taskDate = null;
                                  if (task.startDate) {
                                    taskDate = new Date(task.startDate);
                                    taskDate.setDate(
                                      taskDate.getDate() + index
                                    );
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
                                  const month = taskDate
                                    ? taskDate.getMonth() + 1
                                    : 0;
                                  const day = taskDate
                                    ? taskDate.getDate()
                                    : 0;

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
                                              onEditingFloorTextChange?.(
                                                e.target.value
                                              )
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
                                                  await onFloorDelete?.(
                                                    detailSubtask.id
                                                  );
                                                  onEditingFloorChange?.(null);
                                                  onEditingFloorTextChange?.(
                                                    ""
                                                  );
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
                                              fontSize:
                                                "clamp(9px, 2vw, 11px)",
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
                                                await onFloorUpdate?.(
                                                  detailSubtask.id,
                                                  {
                                                    title: editingFloorText,
                                                  }
                                                );
                                                onEditingFloorChange?.(null);
                                                onEditingFloorTextChange?.("");
                                                // 토글은 열어둠
                                              } catch (error) {
                                                console.error(
                                                  "계획 수정 실패:",
                                                  error
                                                );
                                                alert(
                                                  "계획 수정에 실패했습니다."
                                                );
                                              }
                                            }}
                                            style={{
                                              background: "var(--brand-teal)",
                                              border: "none",
                                              borderRadius: "6px",
                                              padding: "4px 12px",
                                              fontSize:
                                                "clamp(9px, 2vw, 11px)",
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
                                            onEditingFloorChange?.(
                                              detailSubtask.id
                                            );
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

                                {/* 페이지네이션 컨트롤 */}
                                {totalSubPages > 1 && (
                                  <div
                                    style={{
                                      display: "flex",
                                      justifyContent: "center",
                                      gap: "12px",
                                      marginTop: "16px",
                                      marginBottom: "16px", // 하단 여백 추가
                                      alignItems: "center",
                                    }}
                                  >
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSubtaskPage((p) =>
                                          Math.max(0, p - 1)
                                        );
                                      }}
                                      disabled={currentSubPage === 0}
                                      style={{
                                        border: "none",
                                        background: "transparent",
                                        cursor:
                                          currentSubPage === 0
                                            ? "default"
                                            : "pointer",
                                        opacity:
                                          currentSubPage === 0 ? 0.3 : 1,
                                        fontWeight: "bold",
                                        fontSize: "18px",
                                        color: "#333",
                                      }}
                                    >
                                      &lt;
                                    </button>
                                    <span
                                      style={{
                                        fontSize: "14px",
                                        fontWeight: "bold",
                                        color: "#4b5563",
                                      }}
                                    >
                                      {currentSubPage + 1} / {totalSubPages}
                                    </span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSubtaskPage((p) =>
                                          Math.min(totalSubPages - 1, p + 1)
                                        );
                                      }}
                                      disabled={
                                        currentSubPage === totalSubPages - 1
                                      }
                                      style={{
                                        border: "none",
                                        background: "transparent",
                                        cursor:
                                          currentSubPage === totalSubPages - 1
                                            ? "default"
                                            : "pointer",
                                        opacity:
                                          currentSubPage === totalSubPages - 1
                                            ? 0.3
                                            : 1,
                                        fontWeight: "bold",
                                        fontSize: "18px",
                                        color: "#333",
                                      }}
                                    >
                                      &gt;
                                    </button>
                                  </div>
                                )}
                              </>
                            );
                          })()}
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: "8px",
                              marginTop: "12px",
                            }}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setScheduleToDelete(task);
                                setShowDeleteModal(true);
                              }}
                              style={{
                                flex: 1,
                                background: "#ef4444",
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
                              계획 삭제
                            </button>
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  // 시작일이 없는 경우 에러
                                  if (!task.startDate) {
                                    throw new Error(
                                      "시작일이 설정되지 않은 일정입니다."
                                    );
                                  }

                                  // 시작일 기준으로 새 계획의 날짜 계산
                                  // 시작일 + (현재 계획 개수)일
                                  const startDate = new Date(task.startDate);
                                  startDate.setHours(0, 0, 0, 0);

                                  // 현재 계획 개수 (기존 subtasks 개수)
                                  const currentPlanCount = task.subtasks
                                    ? task.subtasks.length
                                    : 0;

                                  // 새 계획의 날짜 = 시작일 + (현재 계획 개수)일
                                  const newPlanDate = new Date(startDate);
                                  newPlanDate.setDate(
                                    startDate.getDate() + currentPlanCount
                                  );

                                  const scheduledDateStr = formatDate(newPlanDate);

                                  // 새 마감일 = 시작일 + (계획 개수 + 1 - 1)일 = 시작일 + (계획 개수)일
                                  // 즉, 새 계획을 추가한 후의 계획 개수를 기준으로 마감일 계산
                                  const newEndDate = new Date(startDate);
                                  newEndDate.setDate(
                                    startDate.getDate() + currentPlanCount
                                  ); // 새 계획 포함한 총 개수
                                  const newEndDateStr = formatDate(newEndDate);

                                  console.log(
                                    "[계획 추가] 시작일:",
                                    task.startDate,
                                    "현재 계획 개수:",
                                    currentPlanCount,
                                    "새 계획 날짜:",
                                    scheduledDateStr,
                                    "새 마감일:",
                                    newEndDateStr
                                  );

                                  // 마감일 업데이트 (계획 개수만큼 일수 추가)
                                  try {
                                    const updateResponse = await onScheduleUpdate?.(
                                      task.id,
                                      {
                                        endDate: newEndDateStr,
                                      }
                                    );

                                    // 서버에 반영되기까지 약간의 지연 후 floor 추가
                                    await new Promise((resolve) =>
                                      setTimeout(resolve, 200)
                                    );

                                    const updatedEndDate =
                                      updateResponse?.endDate || newEndDateStr;
                                    console.log(
                                      "[마감일 업데이트 성공] 새 마감일:",
                                      updatedEndDate,
                                      "계획 날짜:",
                                      scheduledDateStr
                                    );
                                  } catch (scheduleError) {
                                    console.error(
                                      "마감일 업데이트 실패:",
                                      scheduleError
                                    );
                                    // 마감일 업데이트 실패 시 에러를 throw하여 상위에서 처리
                                    throw new Error(
                                      "마감일 업데이트에 실패했습니다. 다시 시도해주세요."
                                    );
                                  }

                                  const newFloor = await onFloorAdd?.(task.id, {
                                    title: "새 계획",
                                    scheduledDate: scheduledDateStr,
                                  });

                                  // 새로 추가된 floor를 편집 모드로 설정
                                  if (newFloor && newFloor.floorId) {
                                    onEditingFloorChange?.(newFloor.floorId);
                                    onEditingFloorTextChange?.("새 계획");
                                  }
                                } catch (error) {
                                  console.error("계획 추가 실패:", error);
                                  const errorMessage =
                                    error.data?.message || error.message || "";
                                  if (
                                    errorMessage.includes("schedule date range") ||
                                    errorMessage.includes("date range")
                                  ) {
                                    alert(
                                      "계획 추가에 실패했습니다. 선택한 날짜가 일정 기간 내에 있어야 합니다. 먼저 일정 기간을 연장해주세요."
                                    );
                                  } else {
                                    alert(
                                      "계획 추가에 실패했습니다. 다시 시도해주세요."
                                    );
                                  }
                                }
                              }}
                              style={{
                                flex: 1,
                                background: "#10b981",
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
                              계획 추가
                            </button>
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();

                                // 수정된 floor들을 저장 (이미 서버에 저장된 floor는 제외)
                                // "계획 추가" 버튼으로 추가된 floor는 이미 서버에 저장되어 있음
                                const floorsToUpdate = task.subtasks.filter(
                                  (s) =>
                                    s.isNew &&
                                    s.id &&
                                    s.id.toString().startsWith("temp-")
                                );

                                // 임시 ID를 가진 floor만 저장 (localStorage에만 있는 경우)
                                for (const floor of floorsToUpdate) {
                                  try {
                                    await onFloorUpdate?.(floor.id, {
                                      title: floor.text,
                                    });
                                  } catch (error) {
                                    console.error("새 floor 저장 실패:", error);
                                  }
                                }

                                // 마감일 연장 - 모든 subtasks 중 가장 마지막 날짜 찾기
                                let latestDate = null;
                                for (const floor of task.subtasks) {
                                  if (floor.scheduledDate) {
                                    const floorDate = new Date(floor.scheduledDate);
                                    if (!latestDate || floorDate > latestDate) {
                                      latestDate = floorDate;
                                    }
                                  }
                                }

                                // 기존 마감일과 비교하여 더 늦은 날짜 사용
                                let currentEndDate = task.endDate
                                  ? new Date(task.endDate)
                                  : null;
                                if (latestDate) {
                                  if (
                                    !currentEndDate ||
                                    latestDate > currentEndDate
                                  ) {
                                    // 마감일을 가장 마지막 floor의 날짜로 업데이트
                                    const newEndDate = new Date(latestDate);
                                    try {
                                      await onScheduleUpdate?.(task.id, {
                                        endDate: newEndDate
                                          .toISOString()
                                          .slice(0, 10),
                                      });
                                    } catch (error) {
                                      console.error("마감일 업데이트 실패:", error);
                                    }
                                  }
                                }

                                onEditingTaskChange?.(null);
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
                              수정 완료
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* ✅ 페이지네이션 컨트롤 */}
                {totalPages > 1 && (
                  <div className="task-pagination">
                    <button
                      onClick={goToPrevPage}
                      disabled={currentPage === 0}
                      className="task-pagination-button"
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M15 19L8 12L15 5" stroke="#4B5563" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    <span className="task-pagination-info">
                      {currentPage + 1} <span className="task-pagination-separator">/</span> {totalPages}
                    </span>
                    <button
                      onClick={goToNextPage}
                      disabled={currentPage === totalPages - 1}
                      className="task-pagination-button"
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 5L16 12L9 19" stroke="#4B5563" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                )}
              </>
            );
          })()
        )}
      </div>

      {/* 계획 삭제 확인 모달 */}
      {
        showDeleteModal && scheduleToDelete && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0, 0, 0, 0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
            }}
            onClick={() => {
              setShowDeleteModal(false);
              setScheduleToDelete(null);
            }}
          >
            <div
              style={{
                background: "#f3f4f6",
                borderRadius: "18px",
                padding: "24px",
                maxWidth: "400px",
                width: "90%",
                boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3
                style={{
                  margin: "0 0 16px 0",
                  fontSize: "18px",
                  fontWeight: 800,
                  color: "#111827",
                  fontFamily: "var(--font-pixel-kr)",
                  textAlign: "center",
                }}
              >
                계획 삭제
              </h3>
              <p
                style={{
                  margin: "0 0 24px 0",
                  fontSize: "14px",
                  color: "#374151",
                  fontFamily: "var(--font-sans)",
                  textAlign: "center",
                  lineHeight: "1.5",
                }}
              >
                이 계획을 삭제하고 싶으신가요?
                <br />
                삭제된 계획은 복구할 수 없습니다.
              </p>
              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  justifyContent: "center",
                }}
              >
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setScheduleToDelete(null);
                  }}
                  style={{
                    flex: 1,
                    background: "#e5e7eb",
                    color: "#111827",
                    border: "none",
                    borderRadius: "12px",
                    padding: "14px",
                    fontSize: "14px",
                    fontWeight: 800,
                    cursor: "pointer",
                    fontFamily: "var(--font-pixel-kr)",
                  }}
                >
                  취소
                </button>
                <button
                  onClick={async () => {
                    try {
                      await onScheduleDelete?.(scheduleToDelete.id);
                      // 선택된 작업이 삭제된 작업이면 선택 해제하여 캘린더 색깔 원 제거
                      if (
                        selectedTask &&
                        selectedTask.id === scheduleToDelete.id.toString()
                      ) {
                        onTaskSelect?.(null);
                      }
                      setShowDeleteModal(false);
                      setScheduleToDelete(null);
                    } catch (error) {
                      console.error("계획 삭제 실패:", error);
                      alert("계획 삭제에 실패했습니다.");
                    }
                  }}
                  style={{
                    flex: 1,
                    background: "#ef4444",
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
                  삭제하기
                </button>
              </div>
            </div>
          </div>
        )
      }
    </div>
  );
}
