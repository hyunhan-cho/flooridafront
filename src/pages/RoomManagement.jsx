import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import TeamHeader from "../components/TeamHeader.jsx";
import Navbar from "../components/Navbar.jsx";

export default function RoomManagement() {
  const navigate = useNavigate();
  const { teamId } = useParams();

  return (
    <div className="app home-view room-management">
      <TeamHeader />

      <style>{`
        .room-management .rm-wrap{ width: 100%; max-width: 100%; }
        .room-management .rm-top{ margin-top: 10px; padding: 10px 2px 6px; color: #fff; }
        .room-management .rm-title-row{ display:flex; align-items:center; gap:10px; margin-bottom:6px; }
        .room-management .rm-back{ width:34px; height:34px; border:0; background:transparent; color:#fff;
          font-size:34px; line-height:1; cursor:pointer; padding:0; transform:translateY(-1px); }
        .room-management .rm-title{ font-size:22px; font-weight:900; letter-spacing:-0.2px; margin:0; }
        .room-management .rm-sub{ margin:0 0 12px 44px; font-size:14px; opacity:0.9; font-weight:700; }

        .room-management .rm-cards{ display:flex; flex-direction:column; gap:16px; margin-top:6px; }
        .room-management .rm-card{ width:96%; max-width: 460px; margin:0 auto; border:0; background:#fff; border-radius:20px;
          padding:24px 28px; box-sizing: border-box; box-shadow:0 8px 16px rgba(0,0,0,0.12); display:flex; align-items:center;
          justify-content:space-between; cursor:pointer; text-align:left; }
        .room-management .rm-card:active{ transform: translateY(1px); }

        .room-management .rm-card-texts{ display:flex; flex-direction:column; gap:8px; }
        .room-management .rm-card-title{ margin:0; font-size:18px; font-weight:900; color:#346c69; letter-spacing:-0.2px; }
        .room-management .rm-card-desc{ margin:4px 0 0; font-size:14px; font-weight:600; color: #4b5563; word-break: keep-all; letter-spacing: -0.5px; }
        .room-management .rm-chevron{ font-size:30px; font-weight:900; color: rgba(0,0,0,0.65); margin-left:14px; transform: translateY(-1px); }
      `}</style>

      <main className="page-content">
        <div className="rm-wrap">
          <section className="rm-top">
            <div className="rm-title-row">
              <button
                className="rm-back"
                type="button"
                aria-label="뒤로가기"
                onClick={() => navigate(-1)}
              >
                ‹
              </button>
              <h2 className="rm-title">방 관리</h2>
            </div>
            <p className="rm-sub">방장은 팀원과 방을 관리할 수 있어요.</p>
          </section>

          <section className="rm-cards">
            <button
              className="rm-card"
              type="button"
              onClick={() => navigate(`/memberremoval/${teamId}`)}
            >
              <div className="rm-card-texts">
                <h3 className="rm-card-title">팀원 관리</h3>
                <p className="rm-card-desc">
                  팀에서 팀원을 퇴출시킬 수 있습니다.
                </p>
              </div>
              <div className="rm-chevron">›</div>
            </button>

            <button
              className="rm-card"
              type="button"
              onClick={() => navigate(`/roomremoval/${teamId}`)}
            >
              <div className="rm-card-texts">
                <h3 className="rm-card-title">방 폭파</h3>
                <p className="rm-card-desc">방장은 방을 폭파할 수 있어요.</p>
              </div>
              <div className="rm-chevron">›</div>
            </button>
          </section>
        </div>
      </main>

      <Navbar />
    </div>
  );
}
