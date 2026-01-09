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

export default function TeamFloorEditPanel({
  open,
  task, // { id(teamFloorId), title, dueDate, assigneeUserIds?, assignees? }
  onClose,
  onSaved,
}) {
  // ✅ 애니메이션 속도 여기서 조절 (느리게: 500~650 추천)
  const ANIM_MS = 900;

  // ✅ "열 때" 시작 딜레이 (원하는 만큼)
  // 0이면 바로 시작, 80~140 정도면 느린 차라락 느낌
  const OPEN_DELAY_MS = 130;

  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let t1;
    let t2;

    if (open && task) {
      setMounted(true);

      // ✅ 열 때도 딜레이 후 visible ON
      // (requestAnimationFrame만 쓰면 첫 프레임이 안 잡혀서 빨라 보일 때가 있음)
      t1 = setTimeout(() => {
        t2 = requestAnimationFrame(() => setVisible(true));
      }, OPEN_DELAY_MS);

      return () => {
        clearTimeout(t1);
        // requestAnimationFrame은 id를 cancelAnimationFrame으로 끊어야 함
        if (t2) cancelAnimationFrame(t2);
      };
    }

    // 닫힘: visible 먼저 끄고, ANIM_MS 후에 unmount
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

  const [saving, setSaving] = useState(false);

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

  // ====== 안전한 버전 (teamId prop 없으면 멤버 로드 안함) ======
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

  const canSubmit =
    title.trim().length > 0 &&
    !!dueDate &&
    selectedUserIds.length === 1 &&
    !saving;

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

  // ✅ open이 false여도 닫힘 애니메이션 동안은 mounted 유지
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

        // ✅ 애니메이션에 필요한 스타일만 추가
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
        .stp-inlineAvatar{width:34px;height:34px;border-radius:999px;background:rgba(0,0,0,.06);display:grid;place-items:center;font-size:12px;flex-shrink:0;}
        .stp-inlineName{font-size:15px;font-weight:900;color:#111;font-family:var(--font-sans);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
        .stp-inlineCheck{width:26px;height:26px;border-radius:999px;border:2px solid rgba(0,0,0,.18);display:flex;align-items:center;justify-content:center;font-weight:900;color:transparent;}
        .stp-inlineCheck.on{background:rgba(47,111,109,.90);border-color:rgba(47,111,109,.90);color:#fff;}

        .stp-helper{font-size:12px;font-weight:800;color:#64748b;padding:6px 2px 0;font-family:var(--font-sans);}
        .stp-error{font-size:12px;font-weight:900;color:rgba(220,38,38,.92);padding:6px 2px 0;font-family:var(--font-sans);}

        .panelTop{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px;}
        .panelTitle{font-size:14px;font-weight:900;color:#111827;font-family:var(--font-pixel-kr);margin:0;}
        .closeBtn{border:none;background:rgba(0,0,0,.08);border-radius:10px;padding:8px 10px;cursor:pointer;font-weight:900;}
        .ctaRow{display:flex;gap:12px;margin-top:14px;}
        .btnGhost,.btnPrimary{height:52px;border-radius:14px;font-weight:900;font-size:16px;border:0;cursor:pointer;flex:1;font-family:var(--font-pixel-kr);}
        .btnGhost{background:rgba(0,0,0,.10);color:#111;}
        .btnPrimary{background:rgba(47,111,109,.90);color:#fff;}
        .btnPrimary:disabled{opacity:.45;cursor:not-allowed;}
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
                      ⬜
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

      <div className="ctaRow">
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
