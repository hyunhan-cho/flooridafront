// src/pages/JoinedTeamPlace.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import TeamHeader from "../components/TeamHeader.jsx";
import { getTeams } from "../services/api.js";
import { API_BASE_URL, AUTH_TOKEN_KEY } from "../config.js";

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

// ✅ 캐릭터 썸네일: "큰 캔버스(96)" 기준으로 그리고 44로 축소
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

export default function JoinedTeamPlace() {
  const navigate = useNavigate();
  const location = useLocation();

  const [teams, setTeams] = useState([]);
  const [teamCharsMap, setTeamCharsMap] = useState({}); // ✅ teamId -> characters[]
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTeams = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await getTeams();
      const list = Array.isArray(data) ? data : [];
      setTeams(list);

      // ✅ 팀별 캐릭터를 "Map"으로 저장 (덮어쓰기 방지)
      const results = await Promise.all(
        list.map(async (t) => {
          try {
            const chars = await requestJson(
              "GET",
              `/api/items/${t.teamId}/characters`
            );
            // ✅ 여기 로그
            console.log(
              "[team characters]",
              "teamId:",
              t.teamId,
              "teamName:",
              t.name,
              "charsLen:",
              Array.isArray(chars) ? chars.length : "not-array",
              "chars:",
              chars
            );

            return [t.teamId, Array.isArray(chars) ? chars : []];
          } catch (e) {
            return [t.teamId, []];
          }
        })
      );

      const nextMap = {};
      results.forEach(([teamId, chars]) => {
        nextMap[teamId] = chars;
      });
      setTeamCharsMap(nextMap);
    } catch (err) {
      if (err?.status === 401) {
        navigate("/login", { replace: true });
        return;
      }
      if (err?.status === 403) {
        setTeams([]);
        setTeamCharsMap({});
        return;
      }
      setError(err?.message ?? "팀 조회 중 오류가 발생했어요.");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    let ignore = false;

    const run = async () => {
      if (ignore) return;
      await fetchTeams();
    };

    run();
    return () => {
      ignore = true;
    };
  }, [location.key, fetchTeams]);

  return (
    <div className="app home-view joined-teamplace">
      <TeamHeader />

      <style>{`
        /* ===== JoinedTeamPlace only (scoped) ===== */
        .joined-teamplace .teamplace-actions{
          display:flex;
          gap:20px;
          margin: 10px 0 16px;
        }
        .joined-teamplace .teamplace-btn{
          width:180px;
          height:60px;
          border-radius:10px;
          border:2px solid rgba(255,255,255,0.75);
          background: rgba(255,255,255,0.12);
          color:#fff;
          font-size:18px;
          font-weight:700;
          cursor:pointer;
        }
        .joined-teamplace .teamplace-section{ margin-top: 6px; }
        .joined-teamplace .teamplace-section-title{
          margin: 0 0 10px;
          font-size: 18px;
          font-weight: 900;
          color: #111;
        }
        .joined-teamplace .teamplace-card-wrap{
          background: rgb(255, 255, 255);
          border-radius: 18px;
          padding: 16px;
          min-height: 600px;
          box-shadow: 0 10px 18px rgba(0,0,0,0.25);
        }
        .joined-teamplace .teamplace-empty{
          margin: 10px 0;
          font-size: 16px;
          color: rgba(0,0,0,0.6);
        }
        .joined-teamplace .teamplace-error{
          margin: 10px 0;
          font-size: 14px;
          color: rgba(220, 38, 38, 0.9);
          font-weight: 800;
        }
        .joined-teamplace .teamplace-teamcard{
          height: 160px;
          background: rgba(142, 142, 142, 0.08);
          border-radius: 14px;
       
          margin-bottom: 14px;
          display: flex;
          flex-direction: column;
          cursor: pointer;
          border: 0;
          width: 100%;
          text-align: left;
        }
        .joined-teamplace .teamplace-teamcard-top{
          padding: 10px 14px;
          background: rgba(0,0,0,0.07);
        }
        .joined-teamplace .teamplace-teamname{
          font-size: 18px;
          font-weight: 900;
          color: #111;
        }
        .joined-teamplace .teamplace-period{
          font-size: 10px;
          color: rgba(0,0,0,0.55);
        }
        .joined-teamplace .teamplace-teamcard-bottom{
          flex: 1;
          display:flex;
          flex-direction: column;
          justify-content: flex-start;
          padding: 8px 14px 14px;
          gap: 10px;
        }

        /* ✅ 캐릭터 슬라이드 줄 */
        .joined-teamplace .teamplace-charRow{
          display:flex;
          gap: 10px;
          overflow-x: auto;
          overflow-y: hidden;
          -webkit-overflow-scrolling: touch;
          padding-bottom: 6px;
        }
        .joined-teamplace .teamplace-charRow::-webkit-scrollbar{ height: 6px; }
        .joined-teamplace .teamplace-charRow::-webkit-scrollbar-thumb{
          background: rgba(0,0,0,0.15);
          border-radius: 999px;
        }

        /* ✅ "회색 네모칸" 없이 캐릭터만 */
        .joined-teamplace .tp-char{
          flex: 0 0 auto;
          width: 44px;
          height: 44px;
          background: transparent;
          border: none;
          display:flex;
          align-items:center;
          justify-content:center;
        }
        /* ✅ 옆 칸 침범 막기 위해 clip */
        .joined-teamplace .tp-charViewport{
          position: relative;
          width: 44px;
          height: 44px;
          overflow: hidden;
          background: transparent;
          border: none;
        }
        .joined-teamplace .tp-charStage{
          position: relative;
        }
      `}</style>

      <main className="page-content">
        <section className="teamplace-actions">
          <button className="teamplace-btn primary" type="button">
            팀 입장하기
          </button>
          <button className="teamplace-btn" type="button">
            팀 만들기
          </button>
        </section>

        <section className="teamplace-section">
          <div className="teamplace-card-wrap">
            <h2 className="teamplace-section-title">현재 들어가 있는 팀</h2>

            {loading ? (
              <p className="teamplace-empty">불러오는 중...</p>
            ) : error ? (
              <p className="teamplace-error">{error}</p>
            ) : teams.length === 0 ? (
              <p className="teamplace-empty">아직 입장한 팀이 없어요.</p>
            ) : (
              teams.map((team) => {
                const chars = teamCharsMap?.[team.teamId] ?? [];

                return (
                  <article
                    className="teamplace-teamcard"
                    key={team.teamId}
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`/teamplacehome/${team.teamId}`)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        navigate(`/teamplacehome/${team.teamId}`);
                      }
                    }}
                  >
                    <div className="teamplace-teamcard-top">
                      <div className="teamplace-teamname">{team.name}</div>
                    </div>

                    <div className="teamplace-teamcard-bottom">
                      <div className="teamplace-period">
                        {team.startDate} ~ {team.endDate}
                      </div>

                      {/* ✅ 팀 멤버 전부 캐릭터 */}
                      <div
                        className="teamplace-charRow"
                        onClick={(e) => e.stopPropagation()} // ✅ 카드 클릭 방지 (스크롤/터치 보호)
                        onMouseDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()} // ✅ 추가
                        onTouchMove={(e) => e.stopPropagation()}
                      >
                        {chars.map((u) => (
                          <CharacterThumb key={u.userId} user={u} />
                        ))}
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>
      </main>

      <Navbar />
    </div>
  );
}
