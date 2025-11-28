// src/pages/mycalendar/AiPlanLoading.jsx
import React from "react";
import "./AiPlanLoading.css";

export default function AiPlanLoading() {
  return (
    <div className="aiLoading">
      <div className="aiSpinner" aria-hidden="true" />
      <p className="aiLoadingMain">계획 일정을 생성 중입니다.</p>
      <p className="aiLoadingSub">조금만 기다려주세요.</p>
    </div>
  );
}
