// src/pages/JoinedTeamPlace.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import TeamHeader from "../components/TeamHeader.jsx";
import { getTeams } from "../services/api.js";

export default function JoinedTeamPlace() {
  const navigate = useNavigate();

  const [teams, setTeams] = useState([]); // [{ teamId, name, startDate, endDate }]
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let ignore = false;

    const fetchTeams = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await getTeams();
        const list = Array.isArray(data) ? data : [];

        if (!ignore) setTeams(list);
      } catch (err) {
        if (err?.status === 403) {
          if (!ignore) setTeams([]);
          return;
        }
        if (!ignore) setError(err?.message ?? "팀 조회 중 오류가 발생했어요.");
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchTeams();
    return () => {
      ignore = true;
    };
  }, []);

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
          flex: 0 0 40px;
          display:flex;
          align-items:center;
          justify-content:flex-start;
          padding: 8px 14px 14px;
        }

        .joined-teamplace .teamplace-btn:active{
          transform: translateY(1px);
        }
      `}</style>

      <main className="page-content">
        {/* 상단 버튼 2개 */}
        <section className="teamplace-actions">
          <button className="teamplace-btn primary" type="button">
            팀 입장하기
          </button>
          <button className="teamplace-btn" type="button">
            팀 만들기
          </button>
        </section>

        {/* 현재 들어가있는 팀 */}
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
                  onClick={() => {
                    // ✅ 여기서 teamId를 URL로 들고 넘어감
                    navigate(`/teamplacehome/${team.teamId}`);
                  }}
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
