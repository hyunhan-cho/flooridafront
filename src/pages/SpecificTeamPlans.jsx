// src/pages/teamcalendar/SpecificTeamPlans.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import TeamHeader from "../components/TeamHeader.jsx";
import Navbar from "../components/Navbar.jsx";

import { API_BASE_URL, AUTH_TOKEN_KEY } from "../config.js";
import { getTeamMembers } from "../services/api.js";

const PencilIcon = () => (
  <svg className="directIconSvg" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
  </svg>
);

function fmtDot(dateStr) {
  if (!dateStr) return "";
  return dateStr.replace(/-/g, ".");
}

async function postJson(path, body) {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (!token) {
    const err = new Error("로그인이 필요합니다.");
    err.status = 401;
    throw err;
  }

  const url = path.startsWith("http")
    ? path
    : `${API_BASE_URL.replace(/\/$/, "")}${path}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body ?? {}),
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const err = new Error(
      (data && (data.message || data.error)) || `HTTP ${res.status}`
    );
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export default function SpecificTeamPlans({ onBack, onSuccess }) {
  const navigate = useNavigate();
  const { teamId: teamIdParam } = useParams();
  const teamId = Number(teamIdParam);

  // 입력값
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");

  // 편집 토글
  const [isEditingTitle, setIsEditingTitle] = useState(true);
  const [isEditingDueDate, setIsEditingDueDate] = useState(false);

  // 담당팀원 선택
  const [pickerOpen, setPickerOpen] = useState(false);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState("");
  const [members, setMembers] = useState([]); // [{userId, username, ...}]
  const [selectedUserIds, setSelectedUserIds] = useState([]);

  // 생성 중
  const [saving, setSaving] = useState(false);

  // teamId 안전장치
  useEffect(() => {
    if (!Number.isFinite(teamId)) {
      navigate("/home", { replace: true });
    }
  }, [teamId, navigate]);

  // 멤버 로드 (토글 열릴 때 1회)
  useEffect(() => {
    let ignore = false;

    const loadMembers = async () => {
      if (!Number.isFinite(teamId)) return;

      try {
        setMembersLoading(true);
        setMembersError("");

        const data = await getTeamMembers(teamId);
        const list = Array.isArray(data) ? data : [];
        if (!ignore) setMembers(list);
      } catch (e) {
        if (!ignore) {
          if (e?.status === 401) return navigate("/login", { replace: true });
          setMembersError(e?.message ?? "팀원 목록을 불러오지 못했어요.");
        }
      } finally {
        if (!ignore) setMembersLoading(false);
      }
    };

    loadMembers();
    return () => {
      ignore = true;
    };
  }, [teamId, navigate]);

  const selectedMembers = useMemo(() => {
    const map = new Map((members || []).map((m) => [m.userId, m]));
    return (selectedUserIds || []).map((id) => map.get(id)).filter(Boolean);
  }, [members, selectedUserIds]);

  const canSubmit =
    title.trim().length > 0 &&
    !!dueDate &&
    selectedUserIds.length > 0 &&
    !saving;

  const toggleUser = (userId) => {
    setSelectedUserIds((prev) => {
      // 이미 선택된 사람 다시 누르면 선택 해제(0명 가능)
      if (prev.length === 1 && prev[0] === userId) return [];
      // 그 외에는 무조건 이 사람만 선택
      return [userId];
    });
  };

  const removeSelected = (userId) => {
    setSelectedUserIds((prev) => prev.filter((id) => id !== userId));
  };
  const handleBack = (e) => {
    if (onBack) {
      onBack(e);
      return;
    }
    if (window.history.length > 1) navigate(-1);
    else navigate(`/teamcalendar/${teamId}`);
  };
  const handleCreate = async () => {
    if (!title.trim()) return alert("세부 계획을 입력해주세요.");
    if (!dueDate) return alert("마감일을 선택해주세요.");
    if (selectedUserIds.length === 0) return alert("담당 팀원을 선택해주세요.");

    try {
      setSaving(true);

      // ✅ 팀 세부계획 생성 (가장 자연스러운 엔드포인트 형태)
      // 백이 다른 URL이면 여기만 바꿔 끼우면 됨.
      const data = await postJson(`/api/teams/${teamId}/floors`, {
        title: title.trim(),
        dueDate, // "YYYY-MM-DD"
        assigneeUserIds: selectedUserIds,
      });

      if (onSuccess) onSuccess(data);
      else navigate(-1);
    } catch (e) {
      if (e?.status === 401) return navigate("/login", { replace: true });

      // 엔드포인트가 아직 없을 수 있으니 메시지 친절하게
      if (e?.status === 404) {
        alert(
          "세부 계획 생성 API가 아직 없거나 URL이 달라요.\n" +
            "백엔드 엔드포인트 확인되면 제가 여기 URL/바디 맞춰줄게."
        );
        return;
      }
      alert(e?.message ?? "세부 계획 생성에 실패했어요.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="app home-view">
      <style>{`
        /* ====== SpecificTeamPlans (single-file CSS) ====== */

        .stp-page {
          width: 100%;
          display: flex;
          justify-content: center;
          margin-top: 15px;
          margin-bottom: 15px;
        }

        .stp-card {
          background: #ffffff;
          border-radius: 28px;
          min-height: 870px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.35);
          margin: 0;
          padding: 20px;
          display: flex;
          flex-direction: column;
          width: 100%;
          max-width: var(--panel-width);
          position: relative;
        }

        .stp-header {
          margin-top: 20px;
          margin-bottom: 24px;
        }
        .stp-title {
          font-size: 18px;
          font-weight: 900;
          color: var(--brand-teal);
          margin: 0 0 8px;
          font-family: var(--font-pixel-kr);
        }
        .stp-sub {
          font-size: 14px;
          color: #64748b;
          margin: 0;
          font-family: var(--font-sans);
        }

        .stp-field {
          display: grid;
          gap: 8px;
          margin-bottom: 20px;
        }
        .stp-label {
          font-size: 12px;
          font-weight: 800;
          color: #0f172a;
          font-family: var(--font-sans);
        }

        .stp-box {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 8px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          border-radius: 12px;
          padding: 10px 12px;
          box-sizing: border-box;
        }

        .stp-text,
        .stp-input {
          font-size: 13px;
          font-weight: 700;
          color: #0f172a;
          flex: 1;
          min-width: 0;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
          border: none;
          outline: none;
          padding: 0;
          margin: 0;
          background: transparent;
          font-family: var(--font-sans);
        }
        .stp-input::placeholder { color: #9ca3af; }

        .stp-dateText { font-size: 11px; font-weight: 800; }
        .stp-dateInput {
          border: none;
          padding: 0;
          font-size: 13px;
          font-weight: 700;
          color: #0f172a;
          outline: none;
          background: transparent;
          font-family: var(--font-sans);
        }

        .stp-iconBtn {
          border: none;
          background: transparent;
          cursor: pointer;
          color: #0f172a;
          padding: 0;
          line-height: 1;
          flex-shrink: 0;
        }
        .directIconSvg { width: 18px; height: 18px; fill: currentColor; }

        /* 담당 팀원 */
        .stp-assigneeBox {
          border: 1px dashed #cbd5e1;
          background: #fff;
          border-radius: 12px;
          padding: 12px;
          box-sizing: border-box;
          width: 100%;
        }

        .stp-assigneeTop {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .stp-addBtn {
          width: 100%;
          height: 46px;
          border-radius: 12px;
          border: 1px dashed #cbd5e1;
          background: #f8fafc;
          color: #334155;
          font-weight: 900;
          font-size: 14px;
          cursor: pointer;
          font-family: var(--font-pixel-kr);
        }
        .stp-addBtn:active { transform: scale(0.99); }

        .stp-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 10px;
        }
        .stp-chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          border-radius: 999px;
          background: rgba(15, 118, 110, 0.10);
          border: 1px solid rgba(15, 118, 110, 0.25);
          color: #0f766e;
          font-weight: 900;
          font-size: 12px;
          font-family: var(--font-sans);
        }
        .stp-chipX {
          border: none;
          background: transparent;
          cursor: pointer;
          font-weight: 900;
          color: #0f766e;
          line-height: 1;
          padding: 0 2px;
        }

        /* 멤버 선택 패널 */
        .stp-picker {
          margin-top: 10px;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          overflow: hidden;
          background: #ffffff;
        }
        .stp-pickerHeader {
          padding: 10px 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
        }
        .stp-pickerTitle {
          font-size: 12px;
          font-weight: 900;
          color: #0f172a;
          font-family: var(--font-sans);
        }
        .stp-pickerClose {
          border: none;
          background: transparent;
          cursor: pointer;
          font-weight: 900;
          color: #0f172a;
          font-family: var(--font-sans);
        }

        .stp-pickerBody {
          max-height: 280px;
          overflow: auto;
          padding: 8px;
        }

        .stp-memberRow {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 10px 10px;
          border-radius: 12px;
          cursor: pointer;
        }
        .stp-memberRow:hover { background: rgba(0,0,0,0.04); }

        .stp-memberName {
          font-size: 13px;
          font-weight: 900;
          color: #0f172a;
          font-family: var(--font-sans);
        }

        .stp-check {
          width: 22px;
          height: 22px;
          border-radius: 6px;
          border: 2px solid rgba(0,0,0,0.25);
          display: grid;
          place-items: center;
          background: #fff;
          flex-shrink: 0;
        }
        .stp-checkOn {
          background: rgba(0,0,0,0.15);
        }

        .stp-helper {
          font-size: 12px;
          font-weight: 800;
          color: #64748b;
          padding: 8px 2px 0;
          font-family: var(--font-sans);
        }
        .stp-error {
          font-size: 12px;
          font-weight: 900;
          color: rgba(220,38,38,.92);
          padding: 8px 2px 0;
          font-family: var(--font-sans);
        }

        /* 하단 버튼 */
        .stp-primaryBtn {
          width: 100%;
          border: none;
          border-radius: 12px;
          background: var(--brand-teal);
          color: white;
          font-weight: 900;
          padding: 14px;
          cursor: pointer;
          margin-top: auto;
          font-size: 14px;
          font-family: var(--font-pixel-kr);
          opacity: 1;
        }
        .stp-primaryBtn:hover { opacity: 0.92; }
        .stp-primaryBtn:active { transform: scale(0.98); }
        .stp-primaryBtn:disabled {
          opacity: 0.35;
          cursor: not-allowed;
          transform: none;
        }
         /* ====== inline picker (버튼 자리에서 펼쳐짐) ====== */

 



.stp-inlineTitle{
  font-size: 14px;
  font-weight: 900;
  color: #111;
  margin: 0 4px 10px;
  font-family: var(--font-sans);
}

.stp-inlineList{
  display:flex;
  flex-direction:column;
  gap: 10px;
  max-height: 260px; /* 리스트 자체 스크롤 */
  overflow: auto;
  padding: 2px 2px 6px;
}

.stp-inlineItem{
  border: 2px solid rgba(0,0,0,.12);
  border-radius: 14px;
  padding: 12px 12px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  cursor:pointer;
  background:#fff;
}

.stp-inlineItem.selected{
  background: rgba(47,111,109,.12);
  border-color: rgba(47,111,109,.85);
}

.stp-inlineLeft{
  display:flex;
  align-items:center;
  gap: 10px;
  min-width: 0;
}

.stp-inlineAvatar{
  width: 34px;
  height: 34px;
  border-radius: 999px;
  background: rgba(0,0,0,.06);
  display:grid;
  place-items:center;
  font-size: 12px;
  flex-shrink:0;
}

.stp-inlineName{
  font-size: 15px;
  font-weight: 900;
  color: #111;
  font-family: var(--font-sans);
  min-width:0;
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
}

.stp-inlineCheck{
  width: 26px;
  height: 26px;
  border-radius: 999px;
  border: 2px solid rgba(0,0,0,.18);
  display:flex;
  align-items:center;
  justify-content:center;
  font-weight: 900;
  color: transparent;
}

.stp-inlineCheck.on{
  background: rgba(47,111,109,.90);
  border-color: rgba(47,111,109,.90);
  color:#fff;
}

.stp-inlineCtas{
  display:flex;
  gap: 12px;
  margin-top: 12px;
}

.stp-inlineCancel,
.stp-inlineAdd{
  height: 52px;
  border-radius: 14px;
  font-weight: 900;
  font-size: 16px;
  border: 0;
  cursor:pointer;
  flex:1;
  font-family: var(--font-pixel-kr);
}

.stp-inlineCancel{
  background: rgba(0,0,0,.10);
  color:#111;
}

.stp-inlineAdd{
  background: rgba(47,111,109,.90);
  color:#fff;
}

.stp-inlineAdd:disabled{
  opacity: .45;
  cursor: not-allowed;
}
  /* BackButton이 absolute/fixed로 박혀있을 때만 강제 정상화 */
.stp-backWrap { margin-bottom: 10px;
 }

/* BackButton 내부에 어떤 태그가 와도 position 강제로 풀어버림 */
.stp-backWrap *{
  position: static !important;
  top: auto !important;
  left: auto !important;
  right: auto !important;
  bottom: auto !important;
}
.stp-backWrap .back-btn{
  margin-left: -10px;   /* 왼쪽으로 당김 (원하는 만큼 숫자 조절) */
  margin-top: -8px;    /* 위로 올림 */
}


      `}</style>

      <TeamHeader />

      <main className="page-content stp-page">
        <div className="card stp-card">
          <div className="stp-header">
            <div className="stp-backWrap">
              <button
                className="back-btn"
                aria-label="뒤로"
                onClick={handleBack}
              >
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M15 18L9 12L15 6"
                    stroke="#000000"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M20 12H9"
                    stroke="#000000"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>

              <h2 className="stp-title">세부 계획을 정해주세요.</h2>
              <p className="stp-sub">
                팀원을 골라 배정할 세부 계획을 만들어보세요.
              </p>
            </div>
          </div>

          {/* 세부 계획 */}
          <div className="stp-field">
            <div className="stp-label">세부 계획</div>
            <div className="stp-box">
              {isEditingTitle ? (
                <input
                  className="stp-input"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="세부 계획을 입력하세요"
                  autoFocus
                />
              ) : (
                <span className="stp-text">
                  {title || "세부 계획을 입력하세요"}
                </span>
              )}

              <button
                className="stp-iconBtn"
                aria-label="세부 계획 수정"
                onClick={() => setIsEditingTitle((v) => !v)}
                type="button"
              >
                <PencilIcon />
              </button>
            </div>
          </div>

          {/* 마감일 (단일 날짜) */}
          <div className="stp-field">
            <div className="stp-label">마감일</div>
            <div className="stp-box">
              {isEditingDueDate ? (
                <input
                  className="stp-dateInput"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  onBlur={() => setIsEditingDueDate(false)}
                />
              ) : (
                <span className="stp-text stp-dateText">
                  {dueDate ? `${fmtDot(dueDate)}.` : "마감일을 선택하세요"}
                </span>
              )}

              <button
                className="stp-iconBtn"
                aria-label="마감일 수정"
                onClick={() => setIsEditingDueDate((v) => !v)}
                type="button"
              >
                <PencilIcon />
              </button>
            </div>
          </div>

          {/* 담당 팀원 */}
          <div className="stp-field">
            <div className="stp-label">담당 팀원</div>

            <div className="stp-assigneeBox">
              {/* ✅ 역할 추가하기 버튼 삭제 */}

              {/* ✅ 팀원 선택창 항상 보이게: pickerOpen true 고정 */}
              <div className="stp-inlineWrap">
                <div className={`stp-inlinePanel open`}>
                  <div className="stp-inlineTitle">팀원 선택 </div>

                  {membersLoading ? (
                    <div className="stp-helper">불러오는 중...</div>
                  ) : membersError ? (
                    <div className="stp-error">{membersError}</div>
                  ) : members.length === 0 ? (
                    <div className="stp-helper">팀원이 없어요.</div>
                  ) : (
                    <div className="stp-inlineList">
                      {members.map((m) => {
                        // ✅ draftUserIds -> selectedUserIds로 바로 체크
                        const selected = selectedUserIds.includes(m.userId);

                        return (
                          <div
                            key={m.userId}
                            className={`stp-inlineItem ${
                              selected ? "selected" : ""
                            }`}
                            // ✅ 클릭하면 즉시 selectedUserIds 토글
                            onClick={() => toggleUser(m.userId)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                toggleUser(m.userId);
                              }
                            }}
                          >
                            <div className="stp-inlineLeft">
                              <div
                                className="stp-inlineAvatar"
                                aria-hidden="true"
                              >
                                ⬜
                              </div>
                              <div className="stp-inlineName">
                                {m.username ?? `user-${m.userId}`}
                              </div>
                            </div>

                            <div
                              className={`stp-inlineCheck ${
                                selected ? "on" : ""
                              }`}
                            >
                              {selected ? "✓" : ""}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* ✅ 취소/추가 버튼 삭제 */}
                </div>
              </div>
            </div>
          </div>

          {/* 생성 버튼 */}
          <button
            className="stp-primaryBtn"
            type="button"
            onClick={handleCreate}
            disabled={!canSubmit}
          >
            {saving ? "생성 중..." : "세부 계획 생성하기"}
          </button>
        </div>
      </main>

      <Navbar />
    </div>
  );
}
