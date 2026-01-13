// src/pages/teamcalendar/SpecificTeamPlans.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import TeamHeader from "../components/TeamHeader.jsx";
import Navbar from "../components/Navbar.jsx";

import { API_BASE_URL, AUTH_TOKEN_KEY } from "../config.js";
import { getTeamMembers } from "../services/api.js";
import { useTeamStore } from "../store/teamStore.js";

import "./SpecificTeamPlans.css";

const PencilIcon = () => (
  <svg className="directIconSvg" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
  </svg>
);

// ✅ DB 좌표 기준 캔버스 (예: 114x126)
const BASE_W = 114;
const BASE_H = 126;

// ✅ 정사각 썸네일(VIEW)에 맞추려면 둘 다 들어가게 min 사용
const scaleToFit = (view) => Math.min(view / BASE_W, view / BASE_H);

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

/* ====== Badge helpers (추가) ====== */
function normalizeList(raw) {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.data)) return raw.data;
  if (Array.isArray(raw?.result)) return raw.result;
  if (Array.isArray(raw?.members)) return raw.members;
  return [];
}

function pickImgUrl(obj) {
  const v =
    obj?.imageUrl ??
    obj?.imgUrl ??
    obj?.badgeImageUrl ??
    obj?.iconUrl ??
    obj?.url ??
    null;

  if (typeof v !== "string") return "";
  const u = v.trim();
  if (!u) return "";
  if (u.startsWith("http") || u.startsWith("/")) return u;
  return `/${u}`;
}

function pickEquippedBadge(member) {
  const list =
    (Array.isArray(member?.equippedBadges) && member.equippedBadges) ||
    (Array.isArray(member?.equipped) && member.equipped) ||
    (Array.isArray(member?.badges) && member.badges) ||
    [];

  // swagger 기준 equipped === true 우선
  return list.find((b) => b?.equipped) ?? list[0] ?? null;
}
/* ================================ */

function CharacterThumb({ user, badge }) {
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

  const VIEW = 34;
  const scale = scaleToFit(VIEW);

  // ✅ 뱃지도 같은 좌표계(114x126) 안에서 렌더 → scale 같이 먹음
  const badgeSrc = pickImgUrl(badge);
  const bx = Number(badge?.offsetX);
  const by = Number(badge?.offsetY);
  const bw = Number(badge?.width);
  const bh = Number(badge?.height);

  const badgeStyle = {
    position: "absolute",
    left: `${Number.isFinite(bx) ? bx : 0}px`,
    top: `${Number.isFinite(by) ? by : 0}px`,
    imageRendering: "pixelated",
    pointerEvents: "none",
    userSelect: "none",
    zIndex: 9999,
  };
  // width/height가 없으면 “억지로 BASE_W/H로 키우지 않음”(= 갑자기 커지는 문제 방지)
  if (Number.isFinite(bw) && bw > 0) badgeStyle.width = `${bw}px`;
  if (Number.isFinite(bh) && bh > 0) badgeStyle.height = `${bh}px`;

  return (
    <div className="stp-avatar">
      <div className="stp-avatarViewport" aria-hidden="true">
        <div
          className="stp-avatarStage"
          style={{
            width: `${BASE_W}px`,
            height: `${BASE_H}px`,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            position: "relative",
          }}
        >
          {sorted.map((it, idx) => {
            const w = Number(it?.width) || BASE_W;
            const h = Number(it?.height) || BASE_H;
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

          {/* ✅ [ADD] badge layer (하드코딩 X, DB offset/size 그대로) */}
          {badgeSrc ? (
            <img
              key={`bd-${user.userId}-${badge?.badgeId ?? badge?.id ?? "x"}`}
              src={badgeSrc}
              alt=""
              style={badgeStyle}
              onError={(e) => (e.currentTarget.style.display = "none")}
              draggable={false}
            />
          ) : null}
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
  const { invalidateTeam } = useTeamStore();

  // 입력값
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const dateInputRef = useRef(null);

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

  // ✅ [ADD] 팀 멤버 뱃지 맵: userId -> equipped badge
  const [badgeByUserId, setBadgeByUserId] = useState({});

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

  // ✅ [ADD] 팀 뱃지 로드 (Swagger: GET /api/badges/team/{teamId}/members)
  useEffect(() => {
    let ignore = false;

    const loadTeamBadges = async () => {
      if (!Number.isFinite(teamId)) return;

      try {
        const res = await requestJson(
          "GET",
          `/api/badges/team/${teamId}/members`
        );
        if (ignore) return;

        const arr = normalizeList(res);
        const map = {};

        arr.forEach((m) => {
          const uid = m?.userId ?? m?.userid ?? m?.memberId;
          if (uid == null) return;

          const badge = pickEquippedBadge(m);
          if (badge) map[uid] = badge;
        });

        setBadgeByUserId(map);
      } catch (e) {
        if (e?.status === 401) return navigate("/login", { replace: true });
        if (!ignore) setBadgeByUserId({});
      }
    };

    loadTeamBadges();
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
      else {
        // ✅ 캐시 무효화 후 TeamPlaceHome으로 이동
        invalidateTeam(teamId, 'floors');
        navigate(`/teamplacehome/${teamId}`, { replace: true });
      }
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
              <input
                className="stp-input"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="세부 계획을 입력하세요"
                autoFocus
              />
              <button className="stp-iconBtn" type="button" tabIndex={-1}>
                <PencilIcon />
              </button>
            </div>
          </div>

          {/* 마감일 */}
          <div className="stp-field">
            <div className="stp-label">마감일</div>
            <div className="stp-box">
              <input
                ref={dateInputRef}
                className="stp-dateInput"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
              <button
                className="stp-iconBtn"
                type="button"
                onClick={() => dateInputRef.current?.showPicker?.()}
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
                    const userBadge = badgeByUserId?.[m.userId] ?? null; // ✅ [ADD]

                    return (
                      <div
                        key={m.userId}
                        className={`stp-inlineItem ${selected ? "selected" : ""
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
                          <CharacterThumb user={userChar} badge={userBadge} />
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
