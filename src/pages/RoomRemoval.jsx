// src/pages/RoomRemoval.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import TeamHeader from "../components/TeamHeader.jsx";
import Navbar from "../components/Navbar.jsx";
import { getTeam, deleteTeam } from "../services/api.js"; // ✅ deleteTeam 추가
import { AUTH_TOKEN_KEY } from "../config.js";

export default function RoomRemoval() {
  const navigate = useNavigate();
  const { teamId: teamIdParam } = useParams();
  const teamId = Number(teamIdParam);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [removing, setRemoving] = useState(false);

  // =========================
  // 1) OWNER 가드
  // =========================
  useEffect(() => {
    let ignore = false;

    const guard = async () => {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      if (!token || !Number.isFinite(teamId)) {
        navigate("/joinedteamplace", { replace: true });
        return;
      }

      try {
        setLoading(true);
        setError("");

        const team = await getTeam(teamId);
        const role = (team?.myRole ?? "").toLowerCase();

        if (role !== "owner") {
          navigate(`/teamplacehome/${teamId}`, { replace: true });
          return;
        }

        if (!ignore) setLoading(false);
      } catch (e) {
        if (e?.status === 401) navigate("/login", { replace: true });
        else navigate("/joinedteamplace", { replace: true });
      }
    };

    guard();
    return () => {
      ignore = true;
    };
  }, [teamId, navigate]);

  const canSubmit =
    password.trim().length > 0 && agreed && !removing && !loading;

  const onSubmit = async () => {
    if (!Number.isFinite(teamId) || !canSubmit) return;

    const ok = window.confirm(
      "정말 방을 폭파할까요?\n폭파 후에는 모든 데이터를 복구할 수 없습니다."
    );
    if (!ok) return;

    try {
      setRemoving(true);
      setError("");

      await deleteTeam(teamId, password.trim()); // ✅ DELETE /api/teams/{teamId} body:{password}

      navigate("/joinedteamplace", { replace: true });
    } catch (e) {
      if (e?.status === 401) return navigate("/login", { replace: true });
      if (e?.status === 403)
        return setError("권한이 없어요. 방장만 폭파할 수 있어요.");
      if (e?.status === 404) return setError("방이 존재하지 않아요.");
      setError(e?.message ?? "방 폭파에 실패했어요.");
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="app home-view room-removal">
      <TeamHeader />

      <style>{`
        .room-removal .rr-wrap{ width: var(--panel-width); max-width: 100%; }
        .room-removal .rr-top{ margin-top: 10px; padding: 10px 2px 6px; color:#fff; }
        .room-removal .rr-back{
          width:34px; height:34px; border:0; background:transparent; color:#fff;
          font-size:34px; cursor:pointer; padding:0; line-height:1;
        }

        .room-removal .rr-card{
          width:92%;
          margin:12px auto 0;
          background:#fff;
          border-radius:28px;
          padding:28px 26px 24px;
          box-shadow:0 14px 28px rgba(0,0,0,.22);
        }

        .room-removal .rr-title{
          margin: 0 0 10px;
          font-size: 26px;
          font-weight: 900;
          letter-spacing: -0.4px;
          color: #2f6f6d;
        }
        .room-removal .rr-desc{
          margin: 0 0 22px;
          font-size: 15px;
          font-weight: 700;
          color: rgba(0,0,0,.55);
          line-height: 1.45;
        }

        .room-removal .rr-section-title{
          margin: 10px 0 10px;
          font-size: 18px;
          font-weight: 900;
          color: #111;
        }

        .room-removal .rr-input{
          width: 100%;
          height: 60px;
          border-radius: 14px;
          border: 2px solid rgba(0,0,0,0.08);
          background: #fff;
          padding: 0 18px;
          font-size: 16px;
          font-weight: 800;
          color: #111;
          outline: none;
          box-sizing: border-box;
        }
        .room-removal .rr-input::placeholder{
          color: rgba(0,0,0,0.35);
          font-weight: 700;
        }
        .room-removal .rr-input:focus{
          border-color: rgba(47,111,109,.45);
          box-shadow: 0 0 0 3px rgba(47,111,109,.12);
        }

        .room-removal .rr-agree{
          margin-top: 18px;
          display:flex;
          align-items:center;
          gap: 12px;
          cursor: pointer;
          user-select: none;
        }

        /* 동그라미 + 체크 */
        .room-removal .rr-circle{
          width: 28px;
          height: 28px;
          border-radius: 999px;
          border: 2px solid rgba(0,0,0,0.35);
          display:grid;
          place-items:center;
          flex: 0 0 28px;
        }
        .room-removal .rr-circle.checked{
          border-color: rgba(47,111,109,.9);
          background: rgba(47,111,109,.12);
        }
        .room-removal .rr-check{
          font-weight: 900;
          font-size: 16px;
          line-height: 1;
          color: rgba(47,111,109,.95);
          transform: translateY(-1px);
        }

        .room-removal .rr-agree-text{
          font-size: 15px;
          font-weight: 800;
          color: rgba(0,0,0,0.75);
        }

        .room-removal .rr-cta{
          margin-top: 26px;
          width: 100%;
          height: 70px;
          border: 0;
          border-radius: 16px;
          background: var(--brand-teal);
          color: #fff;
          font-size: 18px;
          font-weight: 900;
          cursor: pointer;
        }
        .room-removal .rr-cta:disabled{
          opacity: .55;
          cursor: not-allowed;
        }

        .room-removal .rr-error{
          margin-top: 12px;
          font-size: 13px;
          color: rgba(220,38,38,.92);
          font-weight: 900;
        }
      `}</style>

      <main className="page-content">
        <div className="rr-wrap">
          <section className="rr-top">
            <button
              className="rr-back"
              type="button"
              onClick={() => navigate(-1)}
            >
              ‹
            </button>
          </section>

          <section className="rr-card">
            <h2 className="rr-title">방 폭파</h2>
            <p className="rr-desc">
              방장은 방을 폭파할 수 있어요.
              <br />
              폭파 후에는 모든 데이터를 복구할 수 없습니다.
            </p>

            {loading ? (
              <div>불러오는 중...</div>
            ) : (
              <>
                <div className="rr-section-title">
                  방장 계정의 비밀번호 확인
                </div>

                <input
                  className="rr-input"
                  type="password"
                  placeholder="계정 비밀번호를 입력하세요"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={removing}
                  autoComplete="current-password"
                />

                <div
                  className="rr-agree"
                  role="checkbox"
                  aria-checked={agreed}
                  tabIndex={0}
                  onClick={() => setAgreed((v) => !v)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setAgreed((v) => !v);
                    }
                  }}
                >
                  <div className={`rr-circle ${agreed ? "checked" : ""}`}>
                    {agreed && <div className="rr-check">✓</div>}
                  </div>
                  <div className="rr-agree-text">
                    위 내용을 확인했으며, 방 폭파에 동의합니다.
                  </div>
                </div>

                <button
                  className="rr-cta"
                  type="button"
                  disabled={!canSubmit}
                  onClick={onSubmit}
                >
                  {removing ? "방 폭파 중..." : "방 폭파하기"}
                </button>

                {error && <div className="rr-error">{error}</div>}
              </>
            )}
          </section>
        </div>
      </main>

      <Navbar />
    </div>
  );
}
