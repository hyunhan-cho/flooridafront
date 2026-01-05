// src/pages/MemberRemoval.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import TeamHeader from "../components/TeamHeader.jsx";
import Navbar from "../components/Navbar.jsx";
import { getTeamCharacters } from "../services/api.js";

export default function MemberRemoval() {
  const navigate = useNavigate();
  const { teamId } = useParams(); // ✅ URL에서 teamId 받기

  const [selectedIds, setSelectedIds] = useState([]); // userId들
  const [members, setMembers] = useState([]); // [{ userId, username, equippedItems }]
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ✅ teamId 없이 들어오면 튕김
  useEffect(() => {
    if (!teamId) navigate("/joinedteamplace");
  }, [teamId, navigate]);

  // ✅ teamId 기반으로 유저 목록 로드
  useEffect(() => {
    let ignore = false;

    const fetchMembers = async () => {
      if (!teamId) return;

      try {
        setLoading(true);
        setError("");

        const data = await getTeamCharacters(teamId);
        const list = Array.isArray(data) ? data : [];

        // username 없는 케이스 방어(혹시 백에서 안 주면)
        const normalized = list
          .filter((x) => x && x.userId != null)
          .map((x) => ({
            userId: x.userId,
            username: x.username ?? `user-${x.userId}`,
            equippedItems: Array.isArray(x.equippedItems)
              ? x.equippedItems
              : [],
          }));

        if (!ignore) {
          setMembers(normalized);
          // 팀 바뀌면 선택 초기화(팀 A 선택했다가 팀 B로 넘어가는 경우 방지)
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

  const toggle = (userId) => {
    setSelectedIds((prev) =>
      prev.includes(userId)
        ? prev.filter((x) => x !== userId)
        : [...prev, userId]
    );
  };

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  return (
    <div className="app home-view member-removal">
      <TeamHeader />

      <style>{`
        .member-removal .mr-wrap{
          width: var(--panel-width);
          max-width: 100%;
        }

        .member-removal .mr-top{
          margin-top: 10px;
          padding: 10px 2px 6px;
          color: #fff;
        }
        .member-removal .mr-title-row{
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 6px;
        }
        .member-removal .mr-back{
          width: 34px;
          height: 34px;
          border: 0;
          background: transparent;
          color: #fff;
          font-size: 34px;
          line-height: 1;
          cursor: pointer;
          padding: 0;
          transform: translateY(-1px);
        }

        .member-removal .mr-card{
          width: 92%;
          margin: 12px auto 0;
          background: #fff;
          border-radius: 28px;
          padding: 22px 22px 26px;
          box-shadow: 0 14px 28px rgba(0,0,0,0.22);
        }

        .member-removal .mr-card-title{
          margin: 0 0 8px;
          font-size: 20px;
          font-weight: 900;
          color: #2f6f6d;
          letter-spacing: -0.2px;
        }
        .member-removal .mr-card-desc{
          margin: 0 0 18px;
          font-size: 14px;
          font-weight: 700;
          color: rgba(0,0,0,0.6);
        }

        .member-removal .mr-label{
          margin: 0 0 10px;
          font-size: 14px;
          font-weight: 900;
          color: rgba(0,0,0,0.65);
        }

        .member-removal .mr-list{
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: 8px;
        }

        .member-removal .mr-item{
          border: 1px solid rgba(0,0,0,0.14);
          border-radius: 12px;
          padding: 14px 14px;
          display:flex;
          align-items:center;
          justify-content: space-between;
          cursor: pointer;
          background: #fff;
          user-select: none;
        }

        .member-removal .mr-item.selected{
          background: rgba(47,111,109,0.12);
          border-color: rgba(47,111,109,0.85);
        }

        .member-removal .mr-name{
          font-size: 16px;
          font-weight: 900;
          color: rgba(0,0,0,0.75);
        }

        .member-removal .mr-check{
          width: 22px;
          height: 22px;
          border-radius: 999px;
          border: 2px solid rgba(0,0,0,0.18);
          display:flex;
          align-items:center;
          justify-content:center;
          font-weight: 900;
          color: #fff;
          background: transparent;
          flex: 0 0 22px;
        }
        .member-removal .mr-item.selected .mr-check{
          background: rgba(47,111,109,0.9);
          border-color: rgba(47,111,109,0.9);
        }

        .member-removal .mr-hint{
          margin-top: 8px;
          font-size: 12px;
          color: rgba(0,0,0,0.45);
          font-weight: 700;
        }
        .member-removal .mr-error{
          margin-top: 8px;
          font-size: 12px;
          color: rgba(220, 38, 38, 0.9);
          font-weight: 900;
        }

        .member-removal .mr-cta{
          margin-top: 18px;
          width: 100%;
          height: 54px;
          border: 0;
          border-radius: 12px;
          background: rgba(47,111,109,0.85);
          color: #fff;
          font-size: 16px;
          font-weight: 900;
          cursor: pointer;
        }
        .member-removal .mr-cta:disabled{
          opacity: 0.5;
          cursor: not-allowed;
        }
        .member-removal .mr-cta:active{
          transform: translateY(1px);
        }
      `}</style>

      <main className="page-content">
        <div className="mr-wrap">
          <section className="mr-top">
            <div className="mr-title-row">
              <button
                className="mr-back"
                type="button"
                aria-label="뒤로가기"
                onClick={() => navigate(-1)}
              >
                ‹
              </button>
            </div>
          </section>

          <section className="mr-card">
            <h3 className="mr-card-title">팀원 관리</h3>
            <p className="mr-card-desc">팀에서 팀원을 퇴출시킬 수 있습니다.</p>

            <p className="mr-label">팀원 선택 (최소 1명)</p>

            {loading ? (
              <div className="mr-hint">불러오는 중...</div>
            ) : error ? (
              <div className="mr-error">{error}</div>
            ) : members.length === 0 ? (
              <div className="mr-hint">표시할 팀원이 없어요.</div>
            ) : (
              <div className="mr-list">
                {members.map((m) => {
                  const selected = selectedSet.has(m.userId);
                  return (
                    <div
                      key={m.userId}
                      className={`mr-item ${selected ? "selected" : ""}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => toggle(m.userId)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ")
                          toggle(m.userId);
                      }}
                    >
                      <div className="mr-name">{m.username}</div>
                      <div className="mr-check">{selected ? "✓" : ""}</div>
                    </div>
                  );
                })}
              </div>
            )}

            <button
              className="mr-cta"
              type="button"
              disabled={selectedIds.length === 0 || loading || !!error}
              onClick={() => {
                console.log(
                  "퇴출 teamId:",
                  teamId,
                  "대상 userIds:",
                  selectedIds
                );
                // TODO: DELETE /api/teams/{teamId}/members (or whatever backend spec)
              }}
            >
              퇴출시키기
            </button>
          </section>
        </div>
      </main>

      <Navbar />
    </div>
  );
}
