// src/pages/mycalendar/DirectAddForm.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import PersonalHeader from "../../components/PersonalHeader.jsx";
import Navbar from "../../components/Navbar.jsx";
import BackButton from "../../components/BackButton.jsx";
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
          <BackButton onClick={onBack || (() => navigate("/mycalendar"))} />
          
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
                <>
                  <input
                    className="directDateInput"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                  <span className="directDateSeparator">~</span>
                  <input
                    className="directDateInput"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    onBlur={() => setIsEditingDates(false)}
                  />
                </>
              ) : (
                <span className="directFieldText directDateText">
                  {startDate && endDate
                    ? `${startDate.replace(/-/g, ".")}.~${endDate.replace(/-/g, ".")}.`
                    : "목표 기간을 선택하세요"}
                </span>
              )}
              <button
                className="directIconBtn"
                aria-label="기간 수정"
                onClick={() => setIsEditingDates(!isEditingDates)}
              >
                <PencilIcon />
              </button>
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

