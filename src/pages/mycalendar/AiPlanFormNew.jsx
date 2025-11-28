// src/pages/mycalendar/AiPlanFormNew.jsx
import React from "react";
import "./AiPlanFormNew.css";

export default function AiPlanFormNew({ onSubmit, error, onBack }) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const [goal, setGoal] = React.useState("");
  const [startDate, setStartDate] = React.useState(todayStr);
  const [endDate, setEndDate] = React.useState(todayStr);
  const [localError, setLocalError] = React.useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!goal.trim()) {
      setLocalError("어떤 목표인지 입력해 주세요.");
      return;
    }
    if (!startDate || !endDate) {
      setLocalError("시작일과 종료일을 모두 선택해 주세요.");
      return;
    }
    if (startDate > endDate) {
      setLocalError("종료일은 시작일보다 빠를 수 없습니다.");
      return;
    }

    setLocalError("");
    onSubmit?.({ goal: goal.trim(), startDate, endDate });
  };

  return (
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
        alignItems: "flex-start",
        justifyContent: "flex-start",
      }}
    >
      <form className="aiForm" onSubmit={handleSubmit}>
        <div className="aiFormTop">
          <button
            className="aiBackBtn"
            type="button"
            onClick={() => {
              if (onBack) {
                onBack();
              } else {
                window.history.back();
              }
            }}
            aria-label="뒤로 가기"
          >
            ‹
          </button>
        </div>
        <div className="aiFormTitle">
          <h2>안녕하세요, AI 플래너입니다!</h2>
          <p>목표와 기간을 입력하시면,</p>
          <p>매일매일의 실천 계획을 세워드립니다.</p>
        </div>

        <div className="aiFormBody">
          <label className="aiLabel">
            어떤 목표인가요?
            <textarea
              className="aiTextarea"
              placeholder="달성하고 싶은 계획을 입력해주세요!"
              rows={4}
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
            />
          </label>

          <label className="aiLabel">
            언제부터인가요?
            <input
              className="aiInput"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </label>

          <label className="aiLabel">
            언제까지인가요?
            <input
              className="aiInput"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </label>

          {(localError || error) && (
            <div className="aiError">{localError || error}</div>
          )}

          <button className="aiPrimaryBtn" type="submit">
            AI로 계획 생성하기
          </button>
        </div>
      </form>
    </div>
  );
}
