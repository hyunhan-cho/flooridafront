import React, { useState } from "react";
import Navbar from "../components/Navbar.jsx";
import PersonalHeader from "../components/PersonalHeader.jsx";

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

const defaultTasks = [
  {
    id: "task-1",
    title: "TOEFL 교재 끝내기",
    progress: "7/10",
    subtasks: [{ id: "sub-1", text: "chapter 2-1 풀기", done: false }],
    color: "#f59768",
  },
  {
    id: "task-2",
    title: "빅데이터 개인 프로젝트",
    progress: "0/7",
    subtasks: [{ id: "sub-2", text: "2차 회의", done: false }],
    color: "#22c7d5",
  },
];

export default function MyCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date(2025, 9, 15)); // 2025년 10월
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);
  const cells = buildMonthMatrix(currentDate);
  const today = new Date();
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

  return (
    <div className="app home-view">
      <PersonalHeader />

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
        {/* 캘린더 섹션 */}
        <div
          style={{
            background: "#EEEEEE",
            borderRadius: "0",
            width: "100%",
            padding: "12px 0",
            margin: 0,
          }}
        >
          {/* 월/년 헤더 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "12px",
              padding: "0 12px",
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
            <h2
              style={{
                margin: 0,
                fontSize: "18px",
                fontWeight: 900,
                color: "#111827",
                fontFamily: "var(--font-pixel-kr)",
              }}
            >
              {monthYear}
            </h2>
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

          {/* 요일 레이블 */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: "4px",
              marginBottom: "10px",
              textAlign: "center",
              fontSize: "12px",
              fontWeight: 900,
              color: "#6b7280",
              textTransform: "lowercase",
              background: "#d9dde3",
              borderRadius: "12px",
              padding: "6px 12px",
              margin: "0 12px 10px 12px",
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
              padding: "0 12px",
            }}
          >
            {cells.map((d, i) => {
              const isTodayCell = isToday(d);
              return (
                <div
                  key={i}
                  style={{
                    aspectRatio: "1",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "14px",
                    fontWeight: 900,
                    color: d ? "#111827" : "transparent",
                    background: isTodayCell ? "#d1d5db" : "transparent",
                    borderRadius: isTodayCell ? "50%" : "8px",
                  }}
                >
                  {d ? d.getDate() : ""}
                </div>
              );
            })}
          </div>
        </div>

        {/* 액션 버튼 섹션 */}
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
            캘린더 추가하기
          </button>
          <button
            onClick={() => setShowAddProjectModal(true)}
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
            프로젝트 추가하기
          </button>
        </div>

        {/* 작업 목록 섹션 */}
        {defaultTasks.map((task) => (
          <div
            key={task.id}
            className="card"
            style={{
              background: "#e5e7eb",
              borderRadius: "18px",
              width: "100%",
              maxWidth: "var(--panel-width)",
              padding: "14px",
              margin: "0 16px 12px 16px",
              display: "flex",
              alignItems: "flex-start",
              gap: "12px",
            }}
          >
            {/* 색상 아이콘 */}
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
            {/* 작업 내용 */}
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
              {/* 서브태스크 */}
              {task.subtasks.map((subtask) => (
                <div
                  key={subtask.id}
                  style={{
                    background: "#f3f4f6",
                    borderRadius: "8px",
                    padding: "8px 12px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      fontSize: "13px",
                      color: "#111827",
                      fontFamily: "var(--font-sans)",
                    }}
                  >
                    {subtask.text}
                  </span>
                  <input
                    type="checkbox"
                    checked={subtask.done}
                    onChange={() => {}}
                    style={{
                      width: "18px",
                      height: "18px",
                      cursor: "pointer",
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </main>

      <Navbar />

      {/* 프로젝트 추가하기 모달 */}
      {showAddProjectModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowAddProjectModal(false)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "18px",
              padding: "32px 24px",
              width: "90%",
              maxWidth: "400px",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.3)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              style={{
                margin: "0 0 8px 0",
                fontSize: "20px",
                fontWeight: 900,
                color: "#111827",
                fontFamily: "var(--font-pixel-kr)",
                textAlign: "center",
              }}
            >
              프로젝트 추가하기
            </h2>
            <p
              style={{
                margin: "0 0 20px 0",
                fontSize: "14px",
                color: "#6b7280",
                fontFamily: "var(--font-sans)",
                textAlign: "center",
              }}
            >
              어떤 방식으로 하시겠습니까?
            </p>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              <button
                onClick={() => {
                  // AI로 추가하기 로직
                  setShowAddProjectModal(false);
                }}
                style={{
                  width: "100%",
                  background: "#2A9699",
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
                AI로 추가하기
              </button>
              <button
                onClick={() => {
                  // 직접 추가하기 로직
                  setShowAddProjectModal(false);
                }}
                style={{
                  width: "100%",
                  background: "#2A9699",
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
                직접 추가하기
              </button>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <button
                  onClick={() => setShowAddProjectModal(false)}
                  style={{
                    width: "50%",
                    background: "#e5e7eb",
                    color: "#111827",
                    border: "none",
                    borderRadius: "12px",
                    padding: "10px",
                    fontSize: "12px",
                    fontWeight: 800,
                    cursor: "pointer",
                    fontFamily: "var(--font-pixel-kr)",
                  }}
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
