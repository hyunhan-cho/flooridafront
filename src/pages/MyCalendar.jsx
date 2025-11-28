// pages/MyCalendar.jsx
import React from "react";
import Navbar from "../components/Navbar.jsx";
import PersonalHeader from "../components/PersonalHeader.jsx";

// ✅ mycalendar 폴더에서 정확하게 컴포넌트들을 불러옵니다.
import AiPlanForm from "./mycalendar/AiPlanForm.jsx";
import AiPlanLoading from "./mycalendar/AiPlanLoading.jsx";
import AiPlanResult from "./mycalendar/AiPlanResult.jsx";
import "./mycalendar/MyCalendarAi.css";

// AI 호출 실패했을 때 임시로 보여줄 더미 일정
function buildFallbackSchedule({ goal, startDate, endDate }) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    return {
      scheduleId: -1,
      title: goal || "AI 플랜",
      startDate: today.toISOString().slice(0, 10),
      endDate: tomorrow.toISOString().slice(0, 10),
      color: "#FDBA74",
      teamId: null,
      floors: [],
    };
  }

  const days =
    Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const steps = Math.min(8, Math.max(3, Math.round(days / 2)));

  const floors = [];
  for (let i = 0; i < steps; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + Math.floor((days * i) / steps));
    floors.push({
      floorId: i + 1,
      title: `${i + 1}단계: ${goal || "계획"}`,
      scheduledDate: d.toISOString().slice(0, 10),
    });
  }

  return {
    scheduleId: -1,
    title: goal || "AI 플랜",
    startDate,
    endDate,
    color: "#FDBA74",
    teamId: null,
    floors,
  };
}

export default function MyCalendar() {
  const [step, setStep] = React.useState("form"); // "form" | "loading" | "result"
  const [schedule, setSchedule] = React.useState(null); // schedule state
  const [error, setError] = React.useState(null);

  const handleSubmit = async ({ goal, startDate, endDate }) => {
    setStep("loading");
    setError(null);

    const payload = { goal, startDate, endDate, teamId: null };

    try {
      const token = localStorage.getItem("accessToken");

      const res = await fetch("https://app.floorida.site/api/schedules/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.warn(
          "AI API 실패, fallback 일정으로 대체합니다.",
          res.status,
          text
        );

        const fallback = buildFallbackSchedule(payload);
        setSchedule(fallback);
        setStep("result");
        return;
      }

      const data = await res.json();
      setSchedule(data);
      setStep("result");
    } catch (e) {
      console.error(e);
      const fallback = buildFallbackSchedule(payload);
      setSchedule(fallback);
      setStep("result");
    }
  };

  const handleRestart = () => {
    setSchedule(null);
    setError(null);
    setStep("form");
  };

  const handleConfirm = () => {
    alert("일정이 나의 개인 캘린더에 추가되었다고 가정하는 자리입니다.");
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
            // 💡 수정: 문제의 원인이 된 box-shadow를 제거합니다.
            // boxShadow: "0 20px 40px rgba(0,0,0,0.35)",
            margin: 0,
            padding: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div className="aiContainer">
            {step === "form" && (
              <AiPlanForm onSubmit={handleSubmit} error={error} />
            )}
            {step === "loading" && <AiPlanLoading />}
            {step === "result" && schedule && (
              <AiPlanResult
                schedule={schedule}
                onConfirm={handleConfirm}
                onRestart={handleRestart}
                // 💡 일정 수정 시 부모 상태를 업데이트하는 함수 전달
                onScheduleUpdate={setSchedule}
              />
            )}
          </div>
        </div>
      </main>

      <Navbar />
    </div>
  );
}
