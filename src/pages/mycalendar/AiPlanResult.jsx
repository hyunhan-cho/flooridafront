// src/pages/mycalendar/AiPlanResult.jsx
import React from "react";
import "./AiPlanResult.css";
import HomeMonthCalendar from "./HomeMonthCalendar.jsx";

// 💡 연필 SVG 아이콘 컴포넌트 (요청하신 모양에 맞춤)
const PencilIcon = () => (
  <svg className="aiIconSvg" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
  </svg>
);

// 💡 달력 SVG 아이콘 컴포넌트는 사용하지 않으므로, 이 부분을 주석 처리하거나 제거할 수 있습니다.
const CalendarIcon = () => (
  <svg className="aiIconSvg" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 4h-3V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11zM5 7V6h14v1H5z" />
  </svg>
);

// 💡 PATCH API 호출 헬퍼 함수 (기존과 동일하게 유지)
async function patchSchedule(scheduleId, body) {
  const token = localStorage.getItem("accessToken");
  if (!token) {
    throw new Error("Authentication token not found.");
  }
  const res = await fetch(
    `https://app.floorida.site/api/schedules/${scheduleId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const errorText = await res.text().catch(() => "Unknown error");
    throw new Error(`API Error: ${res.status} - ${errorText}`);
  }
  return res.json();
}

export default function AiPlanResult({
  schedule,
  onConfirm,
  onRestart,
  onScheduleUpdate,
}) {
  const { scheduleId, title, startDate, endDate, floors, color, goalSummary } =
    schedule || {};

  const [isEditingTitle, setIsEditingTitle] = React.useState(false);
  const [isEditingDates, setIsEditingDates] = React.useState(false);

  const [editedTitle, setEditedTitle] = React.useState(title);
  const [editedStartDate, setEditedStartDate] = React.useState(startDate);
  const [editedEndDate, setEditedEndDate] = React.useState(endDate);

  React.useEffect(() => {
    setEditedTitle(title);
    setEditedStartDate(startDate);
    setEditedEndDate(endDate);
  }, [title, startDate, endDate]);

  const handleSave = async (field) => {
    let payload = {};
    if (field === "title" && editedTitle !== title) {
      payload = { title: editedTitle.trim() };
    } else if (field === "dates") {
      if (editedStartDate > editedEndDate) {
        alert("종료일은 시작일보다 빠를 수 없습니다.");
        return;
      }
      if (editedStartDate !== startDate || editedEndDate !== endDate) {
        payload = { startDate: editedStartDate, endDate: editedEndDate };
      }
    } else {
      field === "title" ? setIsEditingTitle(false) : setIsEditingDates(false);
      return;
    }

    if (Object.keys(payload).length === 0) {
      field === "title" ? setIsEditingTitle(false) : setIsEditingDates(false);
      return;
    }

    try {
      const updatedSchedule = await patchSchedule(scheduleId, payload);
      onScheduleUpdate(updatedSchedule);
      field === "title" ? setIsEditingTitle(false) : setIsEditingDates(false);
    } catch (error) {
      console.error("일정 수정 실패:", error);
      alert("일정 수정에 실패했습니다. (권한 또는 API 오류 확인)");
      setEditedTitle(title);
      setEditedStartDate(startDate);
      setEditedEndDate(endDate);
      field === "title" ? setIsEditingTitle(false) : setIsEditingDates(false);
    }
  };

  const handleKeyDown = (e, field) => {
    if (e.key === "Enter") {
      handleSave(field);
    }
  };

  return (
    <div className="aiResult">
      <div className="aiResultHeader">
        <h2 className="aiResultTitle">계획이 완성되었어요!</h2>
        <p className="aiResultSub">수정할 부분이 있는지 확인해주세요.</p>
      </div>

      {/* 1. 프로젝트 이름 필드 (수정 가능) */}
      <div className="aiField">
        <div className="aiFieldLabel">프로젝트 이름</div>
        <div className="aiFieldBox">
          {isEditingTitle ? (
            <input
              className="aiEditInput"
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, "title")}
              onBlur={() => handleSave("title")}
              autoFocus
            />
          ) : (
            <span className="aiFieldText">{title}</span>
          )}

          <button
            className="aiIconBtn"
            aria-label="제목 수정"
            onClick={() =>
              isEditingTitle ? handleSave("title") : setIsEditingTitle(true)
            }
          >
            {isEditingTitle ? "저장" : <PencilIcon />}
          </button>
        </div>
      </div>

      {/* 2. 목표 기간 필드 (수정 가능) */}
      <div className="aiField">
        <div className="aiFieldLabel">목표 기간</div>
        <div className="aiFieldBox aiDateFieldBox">
          {isEditingDates ? (
            <>
              <input
                className="aiDateInput"
                type="date"
                value={editedStartDate}
                onChange={(e) => setEditedStartDate(e.target.value)}
              />
              <span className="aiDateSeparator">~</span>
              <input
                className="aiDateInput"
                type="date"
                value={editedEndDate}
                onChange={(e) => setEditedEndDate(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, "dates")}
                onBlur={() => handleSave("dates")}
              />
            </>
          ) : (
            <span className="aiFieldText">
              {startDate} ~ {endDate}
            </span>
          )}

          <button
            className="aiIconBtn"
            aria-label="기간 수정"
            onClick={() =>
              isEditingDates ? handleSave("dates") : setIsEditingDates(true)
            }
          >
            {/* 💡 달력 대신 연필 아이콘 사용 */}
            {isEditingDates ? "저장" : <PencilIcon />}
          </button>
        </div>
      </div>

      {/* 3. AI 계획 설명 박스 (goalSummary) */}
      <div className="aiField">
        <div className="aiFieldLabel">AI 계획 설명</div>
        <div className="aiDescBox">
          {goalSummary || "선택한 기간 안에서 단계별 계획 일정을 생성했어요."}
        </div>
      </div>

      {/* 4. 캘린더 섹션 */}
      <div className="aiCalendarSection">
        <div className="aiCalendarSectionTitle">캘린더로 한눈에 보기</div>
        <div className="aiCalendarBox">
          <HomeMonthCalendar
            startDate={startDate}
            endDate={endDate}
            floors={floors}
            accentColor={color}
          />
        </div>
      </div>

      {/* 5. 버튼 */}
      <button className="aiPrimaryBtn" type="button" onClick={onConfirm}>
        이대로 결정하기!
      </button>
      <div className="aiNotice">나의 개인 캘린더에 추가됩니다.</div>
      <button className="aiSecondaryBtn" type="button" onClick={onRestart}>
        처음부터 다시 입력하기
      </button>
      <div className="aiNotice">프롬프트 입력 창으로 돌아갑니다.</div>
    </div>
  );
}
