// src/components/TeamFloorEditPanel.jsx
import React, { useEffect, useMemo, useState } from "react";
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

async function requestJson(method, path, body) {
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
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
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

function todayYmd() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ✅ 캐릭터 썸네일 (TeamPlace에서 쓰던 방식 그대로)
function CharacterThumb({ user }) {
  const items = Array.isArray(user?.equippedItems) ? user.equippedItems : [];

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
  const VIEW = 44;
  const scale = VIEW / LOGICAL;

  return (
    <div className="tp-char">
      <div className="tp-charViewport" aria-hidden="true">
        <div
          className="tp-charStage"
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

export default function TeamFloorEditPanel({
  open,
  task, // { id(teamFloorId), title, dueDate, assigneeUserIds?, assignees? }
  onClose,
  onSaved,
  onDeleted,
  teamEndDate, // ✅ TeamCalendar에서 내려준 "YYYY-MM-DD" (없을 수도)
}) {
  const ANIM_MS = 900;
  const OPEN_DELAY_MS = 130;

  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  // ✅ min = 오늘 (오늘 이전 선택 금지)
  const minDate = useMemo(() => todayYmd(), []);

  // ✅ max = 팀 endDate (팀 endDate 초과 선택 금지)
  // 단, endDate가 오늘보다 과거면 min > max라서 input이 꼬이니까 max를 제거(undefined)
  const maxDate = useMemo(() => {
    if (!teamEndDate) return undefined;
    if (teamEndDate < minDate) return undefined;
    return teamEndDate;
  }, [teamEndDate, minDate]);

  useEffect(() => {
    let t1;
    let t2;

    if (open && task) {
      setMounted(true);
      t1 = setTimeout(() => {
        t2 = requestAnimationFrame(() => setVisible(true));
      }, OPEN_DELAY_MS);

      return () => {
        clearTimeout(t1);
        if (t2) cancelAnimationFrame(t2);
      };
    }

    setVisible(false);
    const t = setTimeout(() => setMounted(false), ANIM_MS);
    return () => clearTimeout(t);
  }, [open, task]);

  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDueDate, setIsEditingDueDate] = useState(false);

  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState("");
  const [members, setMembers] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState([]);

  // ✅ teamId 캐릭터 맵
  const [teamCharByUserId, setTeamCharByUserId] = useState({});

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ✅ task 로드 시 초기 세팅
  useEffect(() => {
    if (!task) return;

    setTitle(task.title ?? "");
    setDueDate(task.dueDate ?? "");

    const initIds =
      Array.isArray(task.assigneeUserIds) && task.assigneeUserIds.length > 0
        ? [task.assigneeUserIds[0]]
        : Array.isArray(task.assignees) && task.assignees.length > 0
        ? [task.assignees[0].userId]
        : [];

    setSelectedUserIds(initIds);
    setIsEditingTitle(false);
    setIsEditingDueDate(false);
  }, [task]);

  // ✅ dueDate가 min/max 범위 밖이면 자동으로 잘라주기
  // - 오늘 이전이면 오늘로 올림
  // - 팀 endDate 초과면 endDate로 내림
  useEffect(() => {
    if (!dueDate) return;

    // 오늘 이전 금지
    if (dueDate < minDate) {
      setDueDate(minDate);
      return;
    }

    // endDate 초과 금지 (maxDate가 있을 때만)
    if (maxDate && dueDate > maxDate) {
      setDueDate(maxDate);
      return;
    }
  }, [dueDate, minDate, maxDate]);

  const teamId = task?.teamId;

  useEffect(() => {
    let ignore = false;

    const loadMembers = async () => {
      if (!open) return;
      if (!Number.isFinite(Number(teamId))) return;

      try {
        setMembersLoading(true);
        setMembersError("");
        const data = await getTeamMembers(Number(teamId));
        const list = Array.isArray(data) ? data : [];
        if (!ignore) setMembers(list);
      } catch (e) {
        if (!ignore)
          setMembersError(e?.message ?? "팀원 목록을 불러오지 못했어요.");
      } finally {
        if (!ignore) setMembersLoading(false);
      }
    };

    loadMembers();
    return () => {
      ignore = true;
    };
  }, [open, teamId]);

  // ✅ 팀 캐릭터 로드 (/api/items/{teamId}/characters)
  useEffect(() => {
    let ignore = false;

    const loadTeamCharacters = async () => {
      if (!open) return;
      if (!Number.isFinite(Number(teamId))) return;

      try {
        const chars = await requestJson(
          "GET",
          `/api/items/${Number(teamId)}/characters`
        );

        const list = Array.isArray(chars) ? chars : [];
        const map = {};
        list.forEach((u) => {
          if (u?.userId != null) map[u.userId] = u;
        });

        if (!ignore) setTeamCharByUserId(map);
      } catch (e) {
        if (!ignore) setTeamCharByUserId({});
      }
    };

    loadTeamCharacters();
    return () => {
      ignore = true;
    };
  }, [open, teamId]);

  const canSubmit =
    title.trim().length > 0 &&
    !!dueDate &&
    selectedUserIds.length === 1 &&
    !saving &&
    !deleting;

  const toggleUser = (userId) => {
    setSelectedUserIds((prev) => {
      if (prev.length === 1 && prev[0] === userId) return [];
      return [userId];
    });
  };

  const selectedMembers = useMemo(() => {
    const map = new Map((members || []).map((m) => [m.userId, m]));
    return (selectedUserIds || []).map((id) => map.get(id)).filter(Boolean);
  }, [members, selectedUserIds]);

  const handleSave = async () => {
    if (!task?.id) return;

    // ✅ 최종 방어 (min/max)
    if (dueDate < minDate) return;
    if (maxDate && dueDate > maxDate) return;

    try {
      setSaving(true);

      const putRes = await requestJson("PUT", `/api/teams/floors/${task.id}`, {
        title: title.trim(),
        dueDate,
      });

      if (selectedUserIds.length === 1) {
        await requestJson("PATCH", `/api/teams/floors/${task.id}/assignees`, {
          assigneeUserIds: selectedUserIds,
        });
      }

      const updatedTask = {
        ...task,
        title: putRes?.title ?? title.trim(),
        dueDate: putRes?.dueDate ?? dueDate,
        assigneeUserIds: selectedUserIds,
        assignees: selectedMembers,
      };

      onSaved?.(updatedTask);
      onClose?.();
    } catch (e) {
      alert(e?.message ?? "수정에 실패했어요.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!task?.id) return;

    const ok = window.confirm("이 세부 계획을 삭제할까요?");
    if (!ok) return;

    try {
      setDeleting(true);
      await requestJson("DELETE", `/api/teams/floors/${task.id}`);
      onDeleted?.(task);
      onClose?.();
    } catch (e) {
      alert(e?.message ?? "삭제에 실패했어요.");
    } finally {
      setDeleting(false);
    }
  };

  if (!mounted || !task) return null;

  return (
    <div
      style={{
        position: "relative",
        zIndex: 1,
        width: "100%",
        maxWidth: "var(--panel-width)",
        margin: "-14px 16px 22px",
        background: "#ffffff",
        borderRadius: "0 0 18px 18px  ",
        boxShadow: "0 12px 26px rgba(0,0,0,0.18)",
        padding: "16px",
        paddingTop: "40px",
        boxSizing: "border-box",
        transform: visible ? "translateY(0)" : "translateY(-14px)",
        opacity: visible ? 1 : 0,
        transitionProperty: "transform, opacity",
        transitionDuration: `${ANIM_MS}ms`,
        transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
        willChange: "transform, opacity",
      }}
    >
      <style>{`
        .stp-field{display:grid;gap:8px;margin-bottom:18px;}
        .stp-label{font-size:12px;font-weight:800;color:#0f172a;font-family:var(--font-sans);}
        .stp-box{width:100%;display:flex;align-items:center;gap:8px;border:1px solid #cbd5e1;background:#fff;border-radius:12px;padding:10px 12px;box-sizing:border-box;}
        .stp-text,.stp-input{font-size:13px;font-weight:700;color:#0f172a;flex:1;min-width:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;border:none;outline:none;padding:0;margin:0;background:transparent;font-family:var(--font-sans);}
        .stp-dateInput{border:none;padding:0;font-size:13px;font-weight:700;color:#0f172a;outline:none;background:transparent;font-family:var(--font-sans);}
        .stp-iconBtn{border:none;background:transparent;cursor:pointer;color:#0f172a;padding:0;line-height:1;flex-shrink:0;}
        .directIconSvg{width:18px;height:18px;fill:currentColor;}

        .stp-inlineTitle{font-size:14px;font-weight:900;color:#111;margin:0 4px 10px;font-family:var(--font-sans);}
        .stp-inlineList{display:flex;flex-direction:column;gap:10px;max-height:240px;overflow:auto;padding:2px 2px 6px;}
        .stp-inlineItem{border:2px solid rgba(0,0,0,.12);border-radius:14px;padding:12px 12px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;background:#fff;}
        .stp-inlineItem.selected{background:rgba(47,111,109,.12);border-color:rgba(47,111,109,.85);}
        .stp-inlineLeft{display:flex;align-items:center;gap:10px;min-width:0;}

        .stp-inlineAvatar{
          width:34px;height:34px;border-radius:999px;
          background:transparent;
          display:grid;place-items:center;
          flex-shrink:0;
          overflow: visible;
        }
        .stp-char{width:34px;height:34px;background:transparent;border:none;display:flex;align-items:center;justify-content:center;}
        .stp-charViewport{
          position:relative;
          width:34px;height:34px;
          overflow: visible;
          background:transparent;border:none;
        }
        .stp-charStage{position:relative;}

        .stp-inlineName{font-size:15px;font-weight:900;color:#111;font-family:var(--font-sans);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
        .stp-inlineCheck{width:26px;height:26px;border-radius:999px;border:2px solid rgba(0,0,0,.18);display:flex;align-items:center;justify-content:center;font-weight:900;color:transparent;}
        .stp-inlineCheck.on{background:rgba(47,111,109,.90);border-color:rgba(47,111,109,.90);color:#fff;}

        .stp-helper{font-size:12px;font-weight:800;color:#64748b;padding:6px 2px 0;font-family:var(--font-sans);}
        .stp-error{font-size:12px;font-weight:900;color:rgba(220,38,38,.92);padding:6px 2px 0;font-family:var(--font-sans);}

        .ctaRow{display:flex;gap:12px;margin-top:14px;}
        .btnGhost,.btnPrimary{height:52px;border-radius:14px;font-weight:900;font-size:16px;border:0;cursor:pointer;flex:1;font-family:var(--font-pixel-kr);}
        .btnGhost{background:rgba(0,0,0,.10);color:#111;}
        .btnPrimary{background:rgba(47,111,109,.90);color:#fff;}
        .btnPrimary:disabled,.btnGhost:disabled{opacity:.45;cursor:not-allowed;}
      `}</style>

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
              min={minDate} // ✅ 오늘 이전 선택 금지
              max={maxDate} // ✅ endDate 초과 선택 금지 (없으면 undefined)
              onChange={(e) => setDueDate(e.target.value)}
              onBlur={() => setIsEditingDueDate(false)}
            />
          ) : (
            <span className="stp-text">
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
        <div className="stp-inlineTitle">담당 팀원</div>

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
              const charUser = teamCharByUserId?.[m.userId];

              return (
                <div
                  key={m.userId}
                  className={`stp-inlineItem ${selected ? "selected" : ""}`}
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
                    <div className="stp-inlineAvatar" aria-hidden="true">
                      {charUser ? (
                        <CharacterThumb user={charUser} />
                      ) : (
                        <div style={{ width: 34, height: 34 }} />
                      )}
                    </div>

                    <div className="stp-inlineName">
                      {m.username ?? `user-${m.userId}`}
                    </div>
                  </div>

                  <div className={`stp-inlineCheck ${selected ? "on" : ""}`}>
                    {selected ? "✓" : ""}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 버튼 */}
      <div className="ctaRow">
        <button
          className="btnGhost"
          type="button"
          onClick={handleDelete}
          disabled={saving || deleting}
        >
          {deleting ? "삭제 중..." : "삭제"}
        </button>

        <button
          className="btnPrimary"
          type="button"
          onClick={handleSave}
          disabled={!canSubmit}
        >
          {saving ? "저장 중..." : "수정 완료"}
        </button>
      </div>
    </div>
  );
}
