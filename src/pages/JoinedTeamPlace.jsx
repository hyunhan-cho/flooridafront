// src/pages/JoinedTeamPlace.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import TeamHeader from "../components/TeamHeader.jsx";
import { getTeams } from "../services/api.js";
import { getTeamMembersBadges } from "../services/badge.js";

// ✅ 팀원 캐릭터 프리뷰 컴포넌트
import { TeamCharactersPreview } from "../components/CharacterPreview.jsx";
// ✅ 팀원 캐릭터 조회 API (GET /api/items/{teamId}/characters)
import { getTeamCharacters } from "../services/team.js";

// ✅ 여기만 너네 라우트에 맞게 필요시 수정
const JOIN_ROUTE = "/teamplace/join";
const CREATE_ROUTE = "/teamplace/create";

export default function JoinedTeamPlace() {
  const navigate = useNavigate();
  const location = useLocation();

  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTeams = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await getTeams();
      const list = Array.isArray(data) ? data : [];
      setTeams(list);
    } catch (err) {
      if (err?.status === 401) {
        navigate("/login", { replace: true });
        return;
      }
      if (err?.status === 403) {
        setTeams([]);
        return;
      }
      setError(err?.message ?? "팀 조회 중 오류가 발생했어요.");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  // ✅ JoinedTeamPlace로 “들어올 때마다” 다시 불러오기
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

        /* ✅✅✅ 버튼/하얀 컨테이너가 퍼지지 않게 page-content 폭 제한 + 가운데 정렬 */
        .joined-teamplace .page-content{
          width: min(420px, 92vw);
          margin: 0 auto;
          box-sizing: border-box;
        }

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
        .joined-teamplace .teamplace-btn:active{
          transform: translateY(1px);
        }

        .joined-teamplace .teamplace-section{
          margin-top: 6px;
        }
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
          overflow: hidden;
          margin-bottom: 14px;
          display: flex;
          flex-direction: column;
          cursor: pointer;
          border: 0;
          width: 100%;
          text-align: left;
        }
        .joined-teamplace .teamplace-teamcard:active{
          transform: translateY(1px);
        }
        .joined-teamplace .teamplace-teamcard-top{
          padding: 10px 14px;
          background: rgba(0,0,0,0.07);
          display:flex;
          align-items: center;
          gap: 10px;
        }
        .joined-teamplace .teamplace-teamname{
          flex: 1;
          min-width: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-size: 18px;
          font-weight: 900;
          color: #111;
        }

        /* ✅✅✅ 핵심: 연한(mid) 영역을 "날짜(상단) + 캐릭터(하단)" 구조로 */
        .joined-teamplace .teamplace-teamcard-mid{
          flex: 1;
          display: flex;
          flex-direction: column;   /* ✅ 날짜 위 / 캐릭터 아래 */
          align-items: stretch;
          justify-content: flex-start;
          gap: 2px;
          padding: 10px 14px 14px;  /* ✅ 연한 영역 내부 여백 */
          min-height: 0;
          box-sizing: border-box;
        }

        /* ✅ 날짜는 연한 영역 상단 */
        .joined-teamplace .teamplace-period{
          font-size: 9px;
          color: rgba(0,0,0,0.55);
          line-height: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          min-width: 0;
          transform: none;          /* ✅ 기존 translateY 제거 */
        }

        /* ✅ 아래쪽: 캐릭터(왼쪽) + → 버튼(오른쪽) 한 줄 */
        .joined-teamplace .teamplace-mid-row{
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          min-height: 0;
        }


        /* ✅✅✅ 팀원 캐릭터 프리뷰: 가로 스크롤(스와이프) */
        .joined-teamplace .teamplace-preview-wrap{
          flex: 1;
          min-width: 0;

          display:flex;
          align-items: center;
          justify-content: flex-start;

          overflow-x: auto;               /* ✅ 실제 스와이프/스크롤 */
          overflow-y: visible;
           
          -webkit-overflow-scrolling: touch;
          touch-action: pan-x;

          padding: 2px 0;
          box-sizing: border-box;

          scrollbar-width: none; /* firefox */
        }
        .joined-teamplace .teamplace-preview-wrap::-webkit-scrollbar{
          display:none; 
        }

        /* ✅ TeamCharactersPreview(컴포넌트 하나)가 내용만큼 넓어지게 */
        .joined-teamplace .teamplace-preview-wrap > *{
          flex: 0 0 auto;
          width: max-content;
        }

        /* ✅ (기존) 미니 버튼 */
        .joined-teamplace .teamplace-mini-btn{
          height: 34px;
          padding: 0 12px;
          border-radius: 10px;
          border: 0;
          background: rgba(0,0,0,0.08);
          color: #111;
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
          white-space: nowrap;
        }
        .joined-teamplace .teamplace-mini-btn:active{
          transform: translateY(1px);
        }

        /* ✅ 초록색 입장 버튼(→) */
        .joined-teamplace .teamplace-enter-btn{
          width: 56px;
          height: 34px;
          padding: 0;
          border-radius: 12px;
          background: #1f9a95;
          color: #fff;
          font-size: 18px;
          font-weight: 900;

          display: flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 auto;
          /* ✅ 버튼 오른쪽 고정 */
          position: absolute;
          right: 0;
          bottom: 10px; /* 위치 미세 조정 */
          z-index: 10;
        }

        /* (기존에 있던 bottom 영역은 이제 안 씀 — 남겨둬도 무방하지만, 실사용은 안 함)
        .joined-teamplace .teamplace-teamcard-bottom{ ... }
        */
       /* 1) 날짜-캐릭터 사이 공백은 최소로 (너가 말한 "위 간격만 넓어짐" 방지) */
.joined-teamplace .teamplace-teamcard-mid{
  gap: 4px;              /* 기존 8px면 줄여 */
  padding-top: 8px;      /* 너무 크면 6~8 */
}

/* 2) 캐릭터+버튼 줄은 아래로 붙이기 */
.joined-teamplace .teamplace-mid-row{
  margin-top: 2px;
  align-items: flex-end;
  position: relative; /* 버튼 기준점 */
  transform: translateY(10px); /* 다시 위로 올림 (32px -> 10px) */
  min-height: 50px; /* 버튼 높이 확보 */
}

/* 3) ✅ 똥 잘림의 진짜 원인 제거: 프리뷰/내부 wrapper overflow 풀고 위 여유 확보 */
.joined-teamplace .teamplace-preview-wrap{
  overflow-x: auto;
  overflow-y: visible;   /* 중요 */
  padding-top: 10px;     /* 똥 머리 공간 */
  padding-right: 64px; /* 버튼 공간 확보 */
}

.joined-teamplace .teamplace-preview-wrap .cp-wrap{
  overflow: visible !important; /* 중요: 내부에서 잘리는 경우 */
}

.joined-teamplace .teamplace-enter-btn{
  /* transform 제거 (absolute로 제어) */
}

      `}</style>

      <main className="page-content">
        <section className="teamplace-actions">
          <button
            className="teamplace-btn primary"
            type="button"
            onClick={() => navigate(JOIN_ROUTE)}
          >
            팀 입장하기
          </button>
          <button
            className="teamplace-btn"
            type="button"
            onClick={() => navigate(CREATE_ROUTE)}
          >
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
              teams.map((team) => (
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

                  {/* ✅✅✅ 연한(mid) 영역: 상단 날짜 + 하단 캐릭터 */}
                  <div
                    className="teamplace-teamcard-mid"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onKeyDown={(e) => e.stopPropagation()}
                    role="presentation"
                  >
                    {/* ✅ 연한 부분 상단에 날짜 */}
                    <div className="teamplace-period">
                      {team.startDate} ~ {team.endDate}
                    </div>

                    {/* ✅ 연한 부분 아래쪽에 캐릭터 + → */}
                    <div className="teamplace-mid-row">
                      <div className="teamplace-preview-wrap">
                        <TeamCharactersPreview
                          teamId={team.teamId}
                          fetcher={getTeamCharacters}
                          badgesFetcher={getTeamMembersBadges}
                          max={999}
                          scale={0.5}
                          showNames={false}
                        />
                      </div>

                      <button
                        type="button"
                        className="teamplace-mini-btn teamplace-enter-btn"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          navigate(`/teamplacehome/${team.teamId}`);
                        }}
                        aria-label="팀플레이스 입장"
                      >
                        →
                      </button>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </main>

      <Navbar />
    </div>
  );
}
