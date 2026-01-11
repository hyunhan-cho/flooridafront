import React from "react";

export default function TaskListSection({
  loading,
  tasks,
  undoneTasks,
  showUndoneQuests,
  onToggleUndoneQuests,
  onSubtaskToggle,
  onUndoneSubtaskToggle,
}) {
  return (
    <>
      {/* 작업 목록 섹션 */}
      {loading ? (
        <div
          style={{
            textAlign: "center",
            padding: "40px",
            color: "#6b7280",
            fontFamily: "var(--font-pixel-kr)",
            width: "100%",
            maxWidth: "var(--panel-width)",
            margin: "0 auto",
          }}
        >
          로딩 중...
        </div>
      ) : tasks.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "40px",
            color: "#6b7280",
            fontFamily: "var(--font-pixel-kr)",
            width: "100%",
            maxWidth: "var(--panel-width)",
            margin: "0 auto",
          }}
        >
          등록된 계획이 없습니다.
        </div>
      ) : (
        tasks.map((task) => {
          const allDone =
            task.subtasks.length > 0 && task.subtasks.every((s) => s.done);
          return (
            <div
              key={task.id}
              className="card"
              style={{
                background: allDone ? "#d1fae5" : "#e5e7eb",
                borderRadius: "18px",
                width: "100%",
                maxWidth: "var(--panel-width)",
                padding: "14px",
                margin: "0 16px 12px 16px",
                display: "flex",
                alignItems: "flex-start",
                gap: "12px",
                transition: "all 0.5s ease-in-out",
                transform: "translateY(0)",
                opacity: 1,
                position: "relative",
              }}
            >
              <div
                style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  background: task.color,
                  flexShrink: 0,
                  marginTop: "2px",
                }}
              />
              <div style={{ flex: 1, position: "relative" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "8px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "15px",
                      fontWeight: 800,
                      color: allDone ? "#059669" : "#111827",
                      fontFamily: "var(--font-sans)",
                    }}
                  >
                    {task.title}
                  </span>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <span
                      style={{
                        background: "#d1d5db",
                        color: "#111827",
                        padding: "4px 10px",
                        borderRadius: "12px",
                        fontSize: "12px",
                        fontWeight: 700,
                        fontFamily: "var(--font-sans)",
                      }}
                    >
                      {task.progress}
                    </span>
                  </div>
                </div>
                {task.subtasks.map((subtask) => (
                  <div
                    key={subtask.id}
                    style={{
                      background: subtask.done ? "#9ca3af" : "#f3f4f6",
                      borderRadius: "8px",
                      padding: "8px 12px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "4px",
                      opacity: subtask.done ? 0.7 : 1,
                      transition: "all 0.3s ease",
                      transform: subtask.done ? "scale(0.98)" : "scale(1)",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "13px",
                        color: subtask.done ? "#6b7280" : "#111827",
                        fontFamily: "var(--font-sans)",
                        textDecoration: subtask.done ? "line-through" : "none",
                      }}
                    >
                      {subtask.text}
                    </span>
                    <input
                      type="checkbox"
                      checked={subtask.done}
                      disabled={subtask.isTeamPlan}
                      onChange={(e) => onSubtaskToggle?.(task, subtask, e)}
                      style={{
                        width: "18px",
                        height: "18px",
                        cursor: "pointer",
                        transition: "transform 0.2s ease",
                      }}
                      onMouseDown={(e) => {
                        e.currentTarget.style.transform = "scale(0.9)";
                      }}
                      onMouseUp={(e) => {
                        e.currentTarget.style.transform = "scale(1)";
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}

      {/* 미달성 퀘스트 섹션 */}
      {undoneTasks.length > 0 && (
        <div
          style={{
            width: "100%",
            maxWidth: "var(--panel-width)",
            margin: "0 16px 12px 16px",
          }}
        >
          {/* 헤더 */}
          <div
            className="card"
            onClick={onToggleUndoneQuests}
            style={{
              background: "#FF9090",
              borderRadius: "18px",
              borderBottomLeftRadius: showUndoneQuests ? "12px" : "18px",
              borderBottomRightRadius: showUndoneQuests ? "12px" : "18px",
              width: "100%",
              padding: "14px 16px",
              paddingBottom: showUndoneQuests ? "18px" : "14px",
              marginBottom: showUndoneQuests ? "0" : "12px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              cursor: "pointer",
            }}
          >
            <span
              style={{
                fontSize: "15px",
                fontWeight: 800,
                color: "#111827",
                fontFamily: "var(--font-pixel-kr)",
              }}
            >
              미달성 퀘스트
            </span>
            <span
              style={{
                fontSize: "12px",
                color: "#6b7280",
                transform: showUndoneQuests ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s ease",
              }}
            >
              ▼
            </span>
          </div>

          {/* 미달성 퀘스트 목록 (토글) */}
          {showUndoneQuests && (
            <div
              className="card"
              style={{
                background: "#f3f4f6",
                borderRadius: "18px",
                borderTopLeftRadius: "0",
                borderTopRightRadius: "0",
                width: "100%",
                padding: "14px",
                paddingTop: "18px",
                marginTop: "-4px",
              }}
            >
              {undoneTasks.map((task) => {
                const allDone =
                  task.subtasks.length > 0 &&
                  task.subtasks.every((s) => s.done);
                return (
                  <div
                    key={task.id}
                    style={{
                      background: "#e5e7eb",
                      borderRadius: "18px",
                      width: "100%",
                      padding: "14px",
                      marginBottom: "12px",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "12px",
                      transition: "all 0.5s ease-in-out",
                      opacity: allDone ? 0.7 : 1,
                    }}
                  >
                    <div
                      style={{
                        width: "24px",
                        height: "24px",
                        borderRadius: "50%",
                        background: task.color,
                        flexShrink: 0,
                        marginTop: "2px",
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "8px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "15px",
                            fontWeight: 800,
                            color: "#111827",
                            fontFamily: "var(--font-sans)",
                          }}
                        >
                          {task.title}
                        </span>
                        <span
                          style={{
                            background: "#d1d5db",
                            color: "#111827",
                            padding: "4px 10px",
                            borderRadius: "12px",
                            fontSize: "12px",
                            fontWeight: 700,
                            fontFamily: "var(--font-sans)",
                          }}
                        >
                          {task.progress}
                        </span>
                      </div>
                      {task.subtasks.map((subtask) => {
                        const subtaskDone = subtask.done || false;
                        return (
                          <div
                            key={subtask.id}
                            style={{
                              background: subtaskDone ? "#9ca3af" : "#f3f4f6",
                              borderRadius: "8px",
                              padding: "8px 12px",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: "4px",
                              opacity: subtaskDone ? 0.7 : 1,
                              transition: "all 0.3s ease",
                              transform: subtaskDone
                                ? "scale(0.98)"
                                : "scale(1)",
                            }}
                          >
                            <span
                              style={{
                                fontSize: "13px",
                                color: subtaskDone ? "#6b7280" : "#111827",
                                fontFamily: "var(--font-sans)",
                                textDecoration: subtaskDone
                                  ? "line-through"
                                  : "none",
                              }}
                            >
                              {subtask.dayNumber}일차
                            </span>
                            <input
                              type="checkbox"
                              checked={subtaskDone}
                              onChange={(e) =>
                                onUndoneSubtaskToggle?.(task, subtask, e)
                              }
                              style={{
                                width: "18px",
                                height: "18px",
                                cursor: "pointer",
                                transition: "transform 0.2s ease",
                              }}
                              onMouseDown={(e) => {
                                e.currentTarget.style.transform = "scale(0.9)";
                              }}
                              onMouseUp={(e) => {
                                e.currentTarget.style.transform = "scale(1)";
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </>
  );
}
