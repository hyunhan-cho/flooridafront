// src/pages/MemberRemoval.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import TeamHeader from "../components/TeamHeader.jsx";
import Navbar from "../components/Navbar.jsx";
import { getTeam, getTeamMembers, removeTeamMember } from "../services/api.js";
import { API_BASE_URL, AUTH_TOKEN_KEY } from "../config.js";

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

// ✅ 캐릭터 썸네일 (fallback 없음: equippedItems []면 아무것도 안 그림)
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
  const VIEW = 34; // ✅ mr 리스트 왼쪽 아바타 크기랑 맞춤
  const scale = VIEW / LOGICAL;

  return (
    <div className="mr-char">
      <div className="mr-charViewport" aria-hidden="true">
        <div
          className="mr-charStage"
          style={{
            width: `${LOGICAL}px`,
            height: `${LOGICAL}px`,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            position: "relative",
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

export default function MemberRemoval() {
  const navigate = useNavigate();
  const { teamId: teamIdParam } = useParams();
  const teamId = Number(teamIdParam);

  const [members, setMembers] = useState([]); // [{ userId, username, role }]
  const [selectedIds, setSelectedIds] = useState([]); // userId[]
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [removing, setRemoving] = useState(false);

  // ✅ teamId 캐릭터 맵: userId -> characterPayload
  const [charByUserId, setCharByUserId] = useState({});

  // =========================
  // 1) OWNER 가드
  // =========================
  useEffect(() => {
    const guard = async () => {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      if (!token || !Number.isFinite(teamId)) {
        navigate("/joinedteamplace", { replace: true });
        return;
      }

      try {
        const team = await getTeam(teamId);
        const role = (team?.myRole ?? "").toLowerCase();

        // OWNER 아니면 튕김
        if (role !== "owner") {
          navigate(`/teamplacehome/${teamId}`, { replace: true });
          return;
        }
      } catch (e) {
        if (e.status === 401) navigate("/login", { replace: true });
        else navigate("/joinedteamplace", { replace: true });
      }
    };

    guard();
  }, [teamId, navigate]);

  // =========================
  // 2) 팀 멤버 목록 로드
  // =========================
  useEffect(() => {
    let ignore = false;

    const fetchMembers = async () => {
      if (!Number.isFinite(teamId)) return;

      try {
        setLoading(true);
        setError("");

        const data = await getTeamMembers(teamId);
        const list = Array.isArray(data) ? data : [];

        const normalized = list
          .filter((x) => x && x.userId != null)
          .map((x) => ({
            userId: x.userId,
            username: x.username ?? `user-${x.userId}`,
            role: (x.role ?? "").toLowerCase(), // owner | member
          }));

        if (!ignore) {
          setMembers(normalized);
          setSelectedIds([]);
        }
      } catch (err) {
        if (!ignore) {
          setError(err?.message ?? "팀원 목록을 불러오지 못했어요.");
          setMembers([]);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchMembers();
    return () => {
      ignore = true;
    };
  }, [teamId]);

  // =========================
  // ✅ 2-1) 팀 캐릭터 로드 (/api/items/{teamId}/characters)
  // =========================
  useEffect(() => {
    let ignore = false;

    const fetchCharacters = async () => {
      if (!Number.isFinite(teamId)) return;

      try {
        const chars = await requestJson(
          "GET",
          `/api/items/${teamId}/characters`
        );
        const arr = Array.isArray(chars) ? chars : [];

        const map = {};
        arr.forEach((u) => {
          if (u?.userId != null) map[u.userId] = u;
        });

        if (!ignore) setCharByUserId(map);
      } catch (e) {
        if (!ignore) setCharByUserId({});
        // 캐릭터 못 불러와도 멤버관리 기능은 살아야 하니까 에러 띄우진 않음
      }
    };

    fetchCharacters();
    return () => {
      ignore = true;
    };
  }, [teamId]);

  // =========================
  // 3) 선택 로직
  // =========================
  const toggle = (userId) => {
    setSelectedIds((prev) =>
      prev.includes(userId)
        ? prev.filter((x) => x !== userId)
        : [...prev, userId]
    );
  };

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  // (선택) OWNER는 선택 못 하게 막고 싶으면:
  const isDisabled = (m) => m.role === "owner";

  return (
    <div className="app home-view member-removal">
      <TeamHeader />

      <style>{`
        .member-removal .mr-wrap{ width: var(--panel-width); max-width: 100%; }
        .member-removal .mr-top{ margin-top: 10px; padding: 10px 2px 6px; color:#fff; }
        .member-removal .mr-back{ width:34px; height:34px; border:0; background:transparent; color:#fff; font-size:34px; cursor:pointer; padding:0; line-height:1; }
        .member-removal .mr-card{
          width:92%; margin:12px auto 0; background:#fff; border-radius:28px;
          padding:28px 26px 24px; box-shadow:0 14px 28px rgba(0,0,0,.22);
        }
        .member-removal .mr-card-title{ margin:0 0 8px; font-size:20px; font-weight:900; color: #2f6f6d; }
        .member-removal .mr-card-desc{ margin:0 0 18px; font-size:14px; font-weight:700; color:rgba(0,0,0,.6); }
        .member-removal .mr-list{ display:flex; flex-direction:column; gap:10px; margin-top:8px; }
        .member-removal .mr-item{
          border:1px solid rgba(0,0,0,.14); border-radius:12px; padding:14px;
          display:flex; align-items:center; justify-content:space-between;
          cursor:pointer; background:#fff;
        }
        .member-removal .mr-item.disabled{ opacity:.45; cursor:not-allowed; }
        .member-removal .mr-item.selected{ background:rgba(47,111,109,.12); border-color:rgba(47,111,109,.85); }
        .member-removal .mr-name{ font-size:16px; font-weight:900; }

        /* ✅ 이름 왼쪽: 캐릭터 + 이름 줄 정렬 */
        .member-removal .mr-left{
          display:flex;
          align-items:center;
          gap:10px;
          min-width:0;
        }

        /* ✅ 캐릭터 영역 */
  .member-removal .mr-char{
    width:34px;
    height:34px;
    flex: 0 0 auto;
    display:flex;
    align-items:center;
    justify-content:center;
    background: transparent;
    border: none;

    /* ✅ 위로 튀어나가는 아이템도 보이게 */
    overflow: visible;
  }

  .member-removal .mr-charViewport{
    width:34px;
    height:34px;

    /* 🔥 여기 핵심: hidden이면 무조건 잘림 */
    overflow: visible;

    background: transparent;
    border: none;
    position: relative;
  }

  .member-removal .mr-charStage{
    position: relative;
    overflow: visible;
  }

        .member-removal .mr-check{
          width:22px; height:22px; border-radius:999px; border:2px solid rgba(0,0,0,.18);
          display:flex; align-items:center; justify-content:center; font-weight:900;
        }
        .member-removal .mr-item.selected .mr-check{ background:rgba(47,111,109,.9); border-color:rgba(47,111,109,.9); color:#fff; }
        .member-removal .mr-cta{
          margin-top:18px; width:100%; height:54px; border:0; border-radius:12px;
          background:rgba(47,111,109,.85); color:#fff; font-size:16px; font-weight:900;
        }
        .member-removal .mr-cta:disabled{ opacity:.5; cursor:not-allowed; }
        .member-removal .mr-error{ margin-top:8px; font-size:12px; color:rgba(220,38,38,.9); font-weight:900; }

        .member-removal .mr-card { color: #111; }
        .member-removal .mr-card * { color: inherit; }
        .member-removal .mr-card-title { color: #2f6f6d; }
        .member-removal .mr-error { color: rgba(220,38,38,.9); }
      `}</style>

      <main className="page-content">
        <div className="mr-wrap">
          <section className="mr-top">
            <button className="mr-back" onClick={() => navigate(-1)}>
              ‹
            </button>
          </section>

          <section className="mr-card">
            <h3 className="mr-card-title">팀원 관리</h3>
            <p className="mr-card-desc">팀에서 팀원을 퇴출시킬 수 있습니다.</p>

            {loading ? (
              <div>불러오는 중...</div>
            ) : error ? (
              <div className="mr-error">{error}</div>
            ) : members.length === 0 ? (
              <div>표시할 팀원이 없어요.</div>
            ) : (
              <div className="mr-list">
                {members.map((m) => {
                  const selected = selectedSet.has(m.userId);
                  const disabled = isDisabled(m);

                  // ✅ 캐릭터 payload 매칭 (없으면 빈 렌더)
                  const charUser = charByUserId?.[m.userId] ?? {
                    userId: m.userId,
                    equippedItems: [],
                  };

                  return (
                    <div
                      key={m.userId}
                      className={`mr-item ${selected ? "selected" : ""} ${
                        disabled ? "disabled" : ""
                      }`}
                      onClick={() => !disabled && toggle(m.userId)}
                    >
                      <div className="mr-left">
                        <CharacterThumb user={charUser} />
                        <div className="mr-name">
                          {m.username} {m.role === "owner" ? "(방장)" : ""}
                        </div>
                      </div>

                      <div className="mr-check">{selected ? "✓" : ""}</div>
                    </div>
                  );
                })}
              </div>
            )}

            <button
              className="mr-cta"
              disabled={
                selectedIds.length === 0 || loading || removing || !!error
              }
              onClick={async () => {
                if (!Number.isFinite(teamId)) return;

                const targets = selectedIds.filter((uid) => {
                  const m = members.find((x) => x.userId === uid);
                  return m && m.role !== "owner";
                });

                if (targets.length === 0) return;

                const ok = window.confirm(
                  `선택한 ${targets.length}명을 퇴출시킬까요?`
                );
                if (!ok) return;

                try {
                  setRemoving(true);
                  setError("");

                  await Promise.all(
                    targets.map((uid) => removeTeamMember(teamId, uid))
                  );

                  setMembers((prev) =>
                    prev.filter((m) => !targets.includes(m.userId))
                  );
                  setSelectedIds([]);

                  // ✅ 캐릭터 맵도 같이 정리(선택사항이지만 깔끔)
                  setCharByUserId((prev) => {
                    const next = { ...(prev || {}) };
                    targets.forEach((uid) => delete next[uid]);
                    return next;
                  });
                } catch (e) {
                  if (e.status === 401) {
                    navigate("/login", { replace: true });
                    return;
                  }
                  if (e.status === 403) {
                    setError("권한이 없어요. 방장만 퇴출할 수 있습니다.");
                    return;
                  }
                  setError(e?.message ?? "퇴출에 실패했어요.");
                } finally {
                  setRemoving(false);
                }
              }}
            >
              {removing ? "퇴출 중..." : "퇴출시키기"}
            </button>
          </section>
        </div>
      </main>

      <Navbar />
    </div>
  );
}
