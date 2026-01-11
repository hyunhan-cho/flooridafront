// src/pages/mycalendar/DirectAddForm.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import PersonalHeader from "../../components/PersonalHeader.jsx";
import Navbar from "../../components/Navbar.jsx";
import { API_BASE_URL, AUTH_TOKEN_KEY } from "../../config.js";
import "./DirectAddForm.css";

const PencilIcon = () => (
  <svg className="directIconSvg" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
  </svg>
);

export default function DirectAddForm({ onBack, onSuccess }) {
  const navigate = useNavigate();
  const [projectName, setProjectName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isEditingName, setIsEditingName] = useState(true);
  const [isEditingDates, setIsEditingDates] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [dateSelectionStep, setDateSelectionStep] = useState(0); // 0: 시작일 선택, 1: 마감일 선택

  const handleCreatePlan = async () => {
    if (!projectName.trim()) {
      alert("프로젝트 이름을 입력해주세요.");
      return;
    }

    if (!startDate || !endDate) {
      alert("목표 기간을 입력해주세요.");
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      alert("종료일은 시작일보다 빠를 수 없습니다.");
      return;
    }

    try {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      if (!token) {
        alert("로그인이 필요합니다.");
        return;
      }

      const res = await fetch(
        `${API_BASE_URL.replace(/\/$/, "")}/api/schedules`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: projectName.trim(),
            startDate,
            endDate,
            teamId: null,
          }),
        }
      );

      if (!res.ok) {
        throw new Error("계획 생성에 실패했습니다.");
      }

      const data = await res.json();

      if (onSuccess) {
        onSuccess(data);
      } else {
        navigate("/mycalendar");
      }
    } catch (error) {
      console.error("계획 생성 실패:", error);
      alert(error.message || "계획 생성에 실패했습니다.");
    }
  };

  return (
    <div className="app home-view">
      <PersonalHeader />
      <main
        className="page-content"
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "center",
          marginTop: "15px",
          marginBottom: "15px",
        }}
      >
        <div
          className="card"
          style={{
            background: "#ffffff",
            borderRadius: "28px",
            minHeight: "870px",
            boxShadow: "0 20px 40px rgba(0,0,0,0.35)",
            margin: 0,
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            width: "100%",
            maxWidth: "var(--panel-width)",
          }}
        >
          <button
            onClick={onBack || (() => navigate("/mycalendar"))}
            style={{
              border: "none",
              background: "transparent",
              fontSize: "28px",
              lineHeight: "34px",
              cursor: "pointer",
              color: "var(--brand-teal)",
              padding: 0,
              marginBottom: "10px",
              alignSelf: "flex-start",
            }}
            aria-label="뒤로 가기"
          >
            ‹
          </button>

          <div className="directAddHeader">
            <h2 className="directAddTitle">직접 추가하시겠어요?</h2>
            <p className="directAddSub">내용을 적어주세요.</p>
          </div>

          {/* 프로젝트 이름 필드 */}
          <div className="directField">
            <div className="directFieldLabel">프로젝트 이름</div>
            <div className="directFieldBox">
              {isEditingName ? (
                <input
                  className="directEditInput"
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="프로젝트 이름을 입력하세요"
                  autoFocus
                />
              ) : (
                <span className="directFieldText">
                  {projectName || "프로젝트 이름을 입력하세요"}
                </span>
              )}
              <button
                className="directIconBtn"
                aria-label="제목 수정"
                onClick={() => setIsEditingName(!isEditingName)}
              >
                <PencilIcon />
              </button>
            </div>
          </div>

          {/* 목표 기간 필드 */}
          <div className="directField">
            <div className="directFieldLabel">목표 기간</div>
            <div className="directFieldBox directDateFieldBox">
              {isEditingDates ? (
                <div style={{ width: "100%", position: "relative" }}>
                  <div
                    style={{
                      marginBottom: "12px",
                      fontSize: "12px",
                      color: "#64748b",
                    }}
                  >
                    {dateSelectionStep === 0
                      ? "시작일을 선택하세요"
                      : "마감일을 선택하세요"}
                  </div>
                  {(() => {
                    // 달력 생성 함수
                    const year = calendarMonth.getFullYear();
                    const month = calendarMonth.getMonth();
                    const first = new Date(year, month, 1);
                    const last = new Date(year, month + 1, 0);
                    const firstWeekday = (first.getDay() + 6) % 7; // Mon=0 ... Sun=6
                    const totalDays = last.getDate();
                    const cells = [];
                    for (let i = 0; i < firstWeekday; i++) cells.push(null);
                    for (let d = 1; d <= totalDays; d++)
                      cells.push(new Date(year, month, d));
                    while (cells.length % 7 !== 0) cells.push(null);

                    const today = new Date();
                    const isToday = (d) =>
                      d &&
                      d.getFullYear() === today.getFullYear() &&
                      d.getMonth() === today.getMonth() &&
                      d.getDate() === today.getDate();

                    const handleDateClick = (date) => {
                      if (!date) return;
                      const dateStr = `${date.getFullYear()}-${String(
                        date.getMonth() + 1
                      ).padStart(2, "0")}-${String(date.getDate()).padStart(
                        2,
                        "0"
                      )}`;

                      if (dateSelectionStep === 0) {
                        // 시작일 선택
                        setStartDate(dateStr);
                        setEndDate(""); // 마감일 초기화
                        setDateSelectionStep(1);
                        // 시작일이 선택된 달력의 월이 아니면 해당 월로 이동
                        const selectedDate = new Date(dateStr);
                        if (
                          selectedDate.getFullYear() !== year ||
                          selectedDate.getMonth() !== month
                        ) {
                          setCalendarMonth(
                            new Date(
                              selectedDate.getFullYear(),
                              selectedDate.getMonth(),
                              1
                            )
                          );
                        }
                      } else {
                        // 마감일 선택
                        if (dateStr < startDate) {
                          // 마감일이 시작일보다 이전이면 시작일로 설정하고 마감일을 새로 선택한 날짜로
                          setStartDate(dateStr);
                          setEndDate("");
                          setDateSelectionStep(1);
                          // 시작일이 선택된 달력의 월이 아니면 해당 월로 이동
                          const selectedDate = new Date(dateStr);
                          if (
                            selectedDate.getFullYear() !== year ||
                            selectedDate.getMonth() !== month
                          ) {
                            setCalendarMonth(
                              new Date(
                                selectedDate.getFullYear(),
                                selectedDate.getMonth(),
                                1
                              )
                            );
                          }
                        } else {
                          setEndDate(dateStr);
                          setIsEditingDates(false);
                          setDateSelectionStep(0);
                        }
                      }
                    };

                    const isInRange = (date) => {
                      if (!date || !startDate) return false;
                      if (!endDate) {
                        const dateStr = `${date.getFullYear()}-${String(
                          date.getMonth() + 1
                        ).padStart(2, "0")}-${String(date.getDate()).padStart(
                          2,
                          "0"
                        )}`;
                        return dateStr === startDate;
                      }
                      const dateStr = `${date.getFullYear()}-${String(
                        date.getMonth() + 1
                      ).padStart(2, "0")}-${String(date.getDate()).padStart(
                        2,
                        "0"
                      )}`;
                      return dateStr >= startDate && dateStr <= endDate;
                    };

                    const isStartDate = (date) => {
                      if (!date || !startDate) return false;
                      const dateStr = `${date.getFullYear()}-${String(
                        date.getMonth() + 1
                      ).padStart(2, "0")}-${String(date.getDate()).padStart(
                        2,
                        "0"
                      )}`;
                      return dateStr === startDate;
                    };

                    const isEndDate = (date) => {
                      if (!date || !endDate) return false;
                      const dateStr = `${date.getFullYear()}-${String(
                        date.getMonth() + 1
                      ).padStart(2, "0")}-${String(date.getDate()).padStart(
                        2,
                        "0"
                      )}`;
                      return dateStr === endDate;
                    };

                    return (
                      <div style={{ width: "100%" }}>
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
                            type="button"
                            onClick={() => {
                              setCalendarMonth(
                                new Date(
                                  calendarMonth.getFullYear(),
                                  calendarMonth.getMonth() - 1,
                                  1
                                )
                              );
                            }}
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
                            {year}년 {month + 1}월
                          </h3>
                          <button
                            type="button"
                            onClick={() => {
                              setCalendarMonth(
                                new Date(
                                  calendarMonth.getFullYear(),
                                  calendarMonth.getMonth() + 1,
                                  1
                                )
                              );
                            }}
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
                          }}
                        >
                          {[
                            "mon",
                            "tue",
                            "wed",
                            "thu",
                            "fri",
                            "sat",
                            "sun",
                          ].map((day) => (
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
                            const todayCell = isToday(d);
                            const inRange = isInRange(d);
                            const start = isStartDate(d);
                            const end = isEndDate(d);

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
                                  background:
                                    start || end
                                      ? "var(--brand-teal)"
                                      : inRange
                                      ? "rgba(58, 130, 132, 0.2)"
                                      : todayCell
                                      ? "#d1d5db"
                                      : "transparent",
                                  borderRadius: "50%",
                                  cursor: d ? "pointer" : "default",
                                  transition: "background-color 0.2s ease",
                                }}
                                onMouseEnter={(e) => {
                                  if (
                                    d &&
                                    !todayCell &&
                                    !inRange &&
                                    !start &&
                                    !end
                                  ) {
                                    e.currentTarget.style.backgroundColor =
                                      "#e5e7eb";
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (
                                    d &&
                                    !todayCell &&
                                    !inRange &&
                                    !start &&
                                    !end
                                  ) {
                                    e.currentTarget.style.backgroundColor =
                                      "transparent";
                                  }
                                }}
                              >
                                {d ? d.getDate() : ""}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <span className="directFieldText directDateText">
                  {startDate && endDate
                    ? `${startDate.replace(/-/g, ".")}.~${endDate.replace(
                        /-/g,
                        "."
                      )}.`
                    : "목표 기간을 선택하세요"}
                </span>
              )}
              {!isEditingDates && (
                <button
                  className="directIconBtn"
                  aria-label="기간 수정"
                  onClick={() => {
                    setIsEditingDates(true);
                    setDateSelectionStep(0);
                    setCalendarMonth(new Date());
                  }}
                >
                  <PencilIcon />
                </button>
              )}
            </div>
          </div>

          {/* 계획 생성하기 버튼 */}
          <button
            className="directPrimaryBtn"
            type="button"
            onClick={handleCreatePlan}
          >
            계획 생성하기!
          </button>
        </div>
      </main>
      <Navbar />
    </div>
  );
}
