// src/pages/MemberRemoval.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import TeamHeader from "../components/TeamHeader.jsx";
import Navbar from "../components/Navbar.jsx";
import { getTeam, getTeamMembers, removeTeamMember } from "../services/api.js";
import { AUTH_TOKEN_KEY } from "../config.js";

export default function MemberRemoval() {
  const navigate = useNavigate();
  const { teamId: teamIdParam } = useParams();
  const teamId = Number(teamIdParam);

  const [members, setMembers] = useState([]); // [{ userId, username, role }]
  const [selectedIds, setSelectedIds] = useState([]); // userId[]
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [removing, setRemoving] = useState(false);

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
        .member-removal .mr-back{ width:34px; height:34px; border:0; background:transparent; color:#fff; font-size:34px; cursor:pointer; }
        .member-removal .mr-card{
          width:92%; margin:12px auto 0; background:#fff; border-radius:28px;
          padding:22px 22px 26px; box-shadow:0 14px 28px rgba(0,0,0,.22);
        }
        .member-removal .mr-card-title{ margin:0 0 8px; font-size:20px; font-weight:900; color:#2f6f6d; }
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
        .member-removal .mr-card,
.member-removal .mr-card *{
  color: #111;
}

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

                  return (
                    <div
                      key={m.userId}
                      className={`mr-item ${selected ? "selected" : ""} ${
                        disabled ? "disabled" : ""
                      }`}
                      onClick={() => !disabled && toggle(m.userId)}
                    >
                      <div className="mr-name">
                        {m.username} {m.role === "owner" ? "(방장)" : ""}
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

                // 혹시라도 owner가 선택된 경우 방어(원래 disabled라 안 되겠지만 안전빵)
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

                  // ✅ UI 반영: 목록에서 삭제된 사람 제거
                  setMembers((prev) =>
                    prev.filter((m) => !targets.includes(m.userId))
                  );
                  setSelectedIds([]);
                } catch (e) {
                  // 백에서 403/401/404 등 줄 수 있으니 메시지 정리
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
