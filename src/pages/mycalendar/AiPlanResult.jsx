// src/pages/mycalendar/AiPlanResult.jsx
import React from "react";
import "./AiPlanResult.css";
// config에서 공통 설정 가져오기
import { API_BASE_URL, AUTH_TOKEN_KEY } from "../../config.js";

const PencilIcon = () => (
  <svg className="aiIconSvg" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
  </svg>
);

// PATCH API 호출 함수
async function patchSchedule(scheduleId, body) {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);

  if (!token) {
    throw new Error("로그인이 필요합니다.");
  }

  const baseUrl = API_BASE_URL.replace(/\/$/, "");
  const res = await fetch(`${baseUrl}/api/schedules/${scheduleId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "Unknown error");
    if (res.status === 403) {
      throw new Error("수정 권한이 없습니다.");
    }
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

    // 1. 변경 사항 확인
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
      // 변경 없음
      field === "title" ? setIsEditingTitle(false) : setIsEditingDates(false);
      return;
    }

    if (Object.keys(payload).length === 0) {
      field === "title" ? setIsEditingTitle(false) : setIsEditingDates(false);
      return;
    }

    // ✅ 수정 로직 분기 (핵심 변경 사항)

    // Case A: 임시 일정 (ID가 없거나 -1) -> 로컬 상태만 업데이트 (API 호출 X)
    if (!scheduleId || scheduleId === -1) {
      const updatedSchedule = { ...schedule, ...payload };
      onScheduleUpdate(updatedSchedule); // 부모 상태 업데이트

      field === "title" ? setIsEditingTitle(false) : setIsEditingDates(false);
      return; // 여기서 종료
    }

    // Case B: 실제 서버 일정 -> PATCH API 호출
    try {
      const updatedSchedule = await patchSchedule(scheduleId, payload);
      onScheduleUpdate(updatedSchedule);
      field === "title" ? setIsEditingTitle(false) : setIsEditingDates(false);
    } catch (error) {
      console.error("일정 수정 실패:", error);
      alert(error.message || "일정 수정에 실패했습니다.");

      // 실패 시 원래 값으로 복구
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

      {/* 1. 프로젝트 이름 필드 */}
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

      {/* 2. 목표 기간 필드 */}
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
            {isEditingDates ? "저장" : <PencilIcon />}
          </button>
        </div>
      </div>

      {/* 3. AI 계획 설명 박스 */}
      <div className="aiField">
        <div className="aiFieldLabel">AI 계획 설명</div>
        <div className="aiDescBox">
          {(() => {
            if (!goalSummary) {
              return "선택한 기간 안에서 단계별 계획 일정을 생성했어요.";
            }
            // "목표:" 다음 부분만 추출
            const goalMatch = goalSummary.match(/목표:\s*([^|]+)/);
            if (goalMatch && goalMatch[1]) {
              return goalMatch[1].trim();
            }
            // "목표:" 형식이 없으면 전체 텍스트에서 첫 번째 부분만 사용
            const parts = goalSummary.split('|');
            if (parts.length > 0) {
              const firstPart = parts[0].trim();
              // "목표:" 제거
              return firstPart.replace(/^목표:\s*/, '').trim() || goalSummary;
            }
            return goalSummary;
          })()}
        </div>
      </div>

      {/* 4. 일정 간략히 보기 섹션 */}
      <div className="aiCalendarSection">
        <div className="aiCalendarSectionTitle">일정 간략히 보기</div>
        <p style={{
          fontSize: "14px",
          color: "#6b7280",
          marginTop: "8px",
          marginBottom: "16px",
          fontFamily: "var(--font-sans)",
        }}>상위 5일 분량을 확인하세요</p>
        <div className="aiScheduleList">
          {floors && floors.length > 0 ? (
            floors.slice(0, 5).map((floor, index) => {
              const floorDate = floor.scheduledDate 
                ? new Date(floor.scheduledDate)
                : (() => {
                    const date = new Date(startDate);
                    date.setDate(date.getDate() + index);
                    return date;
                  })();
              
              const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
              const weekday = weekdays[floorDate.getDay()];
              const month = floorDate.getMonth() + 1;
              const day = floorDate.getDate();
              
              return (
                <div key={floor.floorId || index} className="aiScheduleItem">
                  <div className="aiScheduleDate">
                    {month}/{day}({weekday})
                  </div>
                  <div className="aiScheduleDivider"></div>
                  <div className="aiScheduleTask">
                    {floor.title || `단계 ${index + 1}`}
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{
              padding: "20px",
              textAlign: "center",
              color: "#6b7280",
              fontFamily: "var(--font-sans)",
            }}>
              계획 항목이 없습니다.
            </div>
          )}
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
