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

/* ================================
   Team characters (TeamPlaceHome 방식 그대로)
================================ */
async function requestJson(method, path) {
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
    method,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
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

function CharacterThumb({ user }) {
  const items = Array.isArray(user?.equippedItems) ? user.equippedItems : [];
  if (!user || items.length === 0) {
    return <div className="stp-avatarPlaceholder" aria-hidden="true" />;
  }

  const order = {
    BACKGROUND: 0,
    BODY: 1,
    CLOTH: 2,
    HAIR: 3,
    FACE: 4,
    ACCESSORY: 5,
    HAT: 6,
  };

  const sorted = [...items].sort((a, b) => {
    const ao = order[a?.itemType] ?? 50;
    const bo = order[b?.itemType] ?? 50;
    return ao - bo;
  });

  const LOGICAL = 100;
  const VIEW = 34;
  const scale = VIEW / LOGICAL;

  return (
    <div className="stp-avatar">
      <div className="stp-avatarViewport" aria-hidden="true">
        <div
          className="stp-avatarStage"
          style={{
            width: `${LOGICAL}px`,
            height: `${LOGICAL}px`,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          {sorted.map((it, idx) => {
            const w = Number(it?.width) || LOGICAL;
            const h = Number(it?.height) || LOGICAL;
            const ox = Number(it?.offsetX) || 0;
            const oy = Number(it?.offsetY) || 0;

            return (
              <img
                key={`${user.userId}-${it.itemId}-${idx}`}
                src={it.imageUrl}
                alt=""
                style={{
                  position: "absolute",
                  left: `${ox}px`,
                  top: `${oy}px`,
                  width: `${w}px`,
                  height: `${h}px`,
                  imageRendering: "pixelated",
                  pointerEvents: "none",
                  userSelect: "none",
                  zIndex: idx + 1,
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
/* ================================ */

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
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState("");
  const [members, setMembers] = useState([]); // [{userId, username, ...}]
  const [selectedUserIds, setSelectedUserIds] = useState([]);

  // ✅ 팀 멤버 캐릭터 맵: userId -> character payload
  const [charByUserId, setCharByUserId] = useState({});

  // 생성 중
  const [saving, setSaving] = useState(false);

  // teamId 안전장치
  useEffect(() => {
    if (!Number.isFinite(teamId)) {
      navigate("/home", { replace: true });
    }
  }, [teamId, navigate]);

  // 멤버 로드
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

  // ✅ 팀 캐릭터 로드 (teamId당 1번)
  useEffect(() => {
    let ignore = false;

    const loadTeamCharacters = async () => {
      if (!Number.isFinite(teamId)) return;

      try {
        const chars = await requestJson(
          "GET",
          `/api/items/${teamId}/characters`
        );
        if (ignore) return;

        const arr = Array.isArray(chars) ? chars : [];
        const map = {};
        arr.forEach((u) => {
          if (u?.userId != null) map[u.userId] = u;
        });
        setCharByUserId(map);
      } catch (e) {
        if (e?.status === 401) return navigate("/login", { replace: true });
        if (!ignore) setCharByUserId({});
      }
    };

    loadTeamCharacters();
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
      if (prev.length === 1 && prev[0] === userId) return [];
      return [userId];
    });
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

      const data = await postJson(`/api/teams/${teamId}/floors`, {
        title: title.trim(),
        dueDate,
        assigneeUserIds: selectedUserIds,
      });

      if (onSuccess) onSuccess(data);
      else navigate(-1);
    } catch (e) {
      if (e?.status === 401) return navigate("/login", { replace: true });
      if (e?.status === 404) {
        alert(
          "세부 계획 생성 API가 아직 없거나 URL이 달라요.\n" +
            "백엔드 엔드포인트 확인되면 여기 URL/바디 맞춰줄게."
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

        .stp-assigneeBox {
          border: 1px dashed #cbd5e1;
          background: #fff;
          border-radius: 12px;
          padding: 12px;
          box-sizing: border-box;
          width: 100%;
        }

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
          max-height: 260px;
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

        .stp-backWrap { margin-bottom: 10px; }
        .stp-backWrap *{
          position: static !important;
          top: auto !important;
          left: auto !important;
          right: auto !important;
          bottom: auto !important;
        }
        .stp-backWrap .back-btn{
          margin-left: -10px;
          margin-top: -8px;
        }

        /* ✅ 캐릭터 썸네일 */
        .stp-avatar{
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          flex-shrink: 0;
        }
        .stp-avatarViewport{
          position: relative;
          width: 34px;
          height: 34px;
          overflow: visible;
        }
        .stp-avatarStage{ position: relative; }
        .stp-avatarPlaceholder{
          width: 28px;
          height: 28px;
          border-radius: 999px;
          background: rgba(0,0,0,.08);
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

          {/* 마감일 */}
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
              <div className="stp-inlineTitle">팀원 선택</div>

              {membersLoading ? (
                <div className="stp-helper">불러오는 중...</div>
              ) : membersError ? (
                <div className="stp-error">{membersError}</div>
              ) : members.length === 0 ? (
                <div className="stp-helper">팀원이 없어요.</div>
              ) : (
                <div className="stp-inlineList">
                  {members.map((m) => {
                    const selected = selectedUserIds.includes(m.userId);
                    const userChar = charByUserId?.[m.userId] ?? null;

                    return (
                      <div
                        key={m.userId}
                        className={`stp-inlineItem ${
                          selected ? "selected" : ""
                        }`}
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
                          <CharacterThumb user={userChar} />
                          <div className="stp-inlineName">
                            {m.username ?? `user-${m.userId}`}
                          </div>
                        </div>

                        <div
                          className={`stp-inlineCheck ${selected ? "on" : ""}`}
                        >
                          {selected ? "✓" : ""}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
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
