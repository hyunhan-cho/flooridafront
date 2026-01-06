// src/pages/TeamPlaceHome.jsx
import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ElevatorDoor from "../components/ElevatorDoor.jsx";
import QuestList from "../components/QuestList.jsx";
import { floors } from "../constants/floors.js";
import BackButton from "../components/BackButton.jsx";
import Navbar from "../components/Navbar.jsx";
import {
  getMyCharacter,
  getCalendarStats,
  getTeam,
  leaveTeam,
} from "../services/api.js";
import { AUTH_TOKEN_KEY } from "../config.js";

import "../App.css";

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function calcDday(targetDate) {
  const today = new Date();
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const t1 = new Date(
    targetDate.getFullYear(),
    targetDate.getMonth(),
    targetDate.getDate()
  );
  const diffMs = t1 - t0;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

const elevatorInsideImg = "/images/frame.png";

// ✅ 임시 더미
const DUMMY_TEAM_MEMBERS = [
  { id: 1, username: "현한" },
  { id: 2, username: "수진" },
];

export default function TeamPlaceHome() {
  const navigate = useNavigate();
  const { teamId: teamIdParam } = useParams();
  const teamId = Number(teamIdParam);

  const [isOpen, setIsOpen] = useState(true);
  const [isMoving, setIsMoving] = useState(false);
  const [currentFloor, setCurrentFloor] = useState(1);
  const [characterImageUrl, setCharacterImageUrl] = useState(null);

  const [progressInfo] = useState({ percent: 0, done: 0, total: 0 });
  const [todayProgress, setTodayProgress] = useState({
    percent: 0,
    done: 0,
    total: 0,
  });

  const [projectCount] = useState(0);

  // ✅ 모두의 할 일
  const [teamMembers, setTeamMembers] = useState([]);
  const [checkedMap, setCheckedMap] = useState({});

  const roomCode = "23572633";

  // ✅ myRole
  const [myRole, setMyRole] = useState(null);
  const isOwner = (myRole ?? "").toLowerCase() === "owner";

  // ✅ leave
  const [leaving, setLeaving] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);

  // ✅ 팀 마감일
  const [teamEndDate, setTeamEndDate] = useState(null);
  const dday = useMemo(() => {
    if (!teamEndDate) return null;
    return calcDday(teamEndDate);
  }, [teamEndDate]);

  // ✅ 팀원 더미 로드
  useEffect(() => {
    setTeamMembers(DUMMY_TEAM_MEMBERS);
    const init = {};
    DUMMY_TEAM_MEMBERS.forEach((m) => (init[m.id] = false));
    setCheckedMap(init);
  }, []);

  // ✅ teamId로 팀 정보(=myRole) 로드
  useEffect(() => {
    const loadTeamRole = async () => {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      if (!token || !Number.isFinite(teamId)) return;

      try {
        const team = await getTeam(teamId);
        setMyRole(team?.myRole ?? null);
        if (team?.endDate) {
          setTeamEndDate(new Date(team.endDate));
        }
      } catch (e) {
        if (e.status === 401) return navigate("/login", { replace: true });
        navigate("/home", { replace: true });
      }
    };

    loadTeamRole();
  }, [teamId, navigate]);

  // ✅ 오늘의 진행도 로드
  useEffect(() => {
    const loadTodayProgress = async () => {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      if (!token) return;

      try {
        const today = new Date();
        const todayStr = formatDate(today);
        const data = await getCalendarStats(todayStr, todayStr);

        // data 형태 방어
        if (Array.isArray(data) && data.length > 0) {
          const todayData = data.find((x) => x.date === todayStr) || data[0];
          const done = todayData?.completedCount || 0;
          const total =
            projectCount > 0 ? projectCount : todayData?.totalCount || 0;
          const percent = total > 0 ? Math.round((done / total) * 100) : 0;
          setTodayProgress({ percent, done, total });
          return;
        }

        if (data && data.totalCount !== undefined) {
          const done = data.completedCount || 0;
          const total = projectCount > 0 ? projectCount : data.totalCount || 0;
          const percent = total > 0 ? Math.round((done / total) * 100) : 0;
          setTodayProgress({ percent, done, total });
        }
      } catch (e) {
        if (e.status === 401) return navigate("/login", { replace: true });
      }
    };

    loadTodayProgress();
  }, [projectCount, teamId, navigate]);

  // ✅ 캐릭터 로드
  useEffect(() => {
    const loadCharacter = async () => {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      if (!token) return;

      try {
        const data = await getMyCharacter();
        if (data?.imageUrl) setCharacterImageUrl(data.imageUrl);
      } catch (e) {}
    };
    loadCharacter();
  }, []);

  const toggleMemberCheck = (memberId) => {
    setCheckedMap((prev) => ({ ...prev, [memberId]: !prev[memberId] }));
  };

  // ✅ 모달에서 “나가기” 눌렀을 때만 API 호출
  const confirmLeave = async () => {
    if (!Number.isFinite(teamId)) return;

    try {
      setLeaving(true);
      await leaveTeam(teamId); // ✅ DELETE
      setLeaveOpen(false);
      navigate("/joinedteamplace", { replace: true });
    } catch (e) {
      if (e.status === 401) return navigate("/login", { replace: true });
      alert(e?.message ?? "방 나가기에 실패했어요.");
    } finally {
      setLeaving(false);
    }
  };

  return (
    <div className="app home-view">
      <style>{`
        .teamplace-actions {
          width: min(420px, 92vw);
          margin: 10px auto 12px;
          display: grid;
          gap: 12px;
        }
        .teamplace-btn {
          height: 64px;
          border-radius: 14px;
          border: 2px solid rgba(255, 255, 255, 0.75);
          background: var(--brand-teal);
          color: #fff;
          font-weight: 800;
          font-size: 18px;
          box-shadow: 0 6px 14px rgba(0, 0, 0, 0.18);
        }

        .card {
          width: min(420px, 92vw);
          margin: 12px auto;
          background: #f4f4f4;
          border-radius: 14px;
          box-shadow: 0 8px 18px rgba(0, 0, 0, 0.18);
          padding: 16px;
        }

        .dday-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .dday-left { font-size: 22px; font-weight: 900; letter-spacing: -0.4px; }
        .dday-right { font-size: 34px; font-weight: 900; }

        .everyone-card .section-title {
          font-size: 22px;
          font-weight: 900;
          margin-bottom: 12px;
        }
        .everyone-list { display: grid; gap: 14px; }

        /* ✅ 아바타 + 오른쪽(이름+태스크박스) */
        .everyone-row{
          display: grid;
          grid-template-columns: 44px 1fr;
          align-items: start;
          gap: 10px;
        }

        
        .member-name {
          font-size: 14px;
          font-weight: 800;
          color: #222;
          margin-bottom: 6px;
        }

        /* ✅ task-box 안에 체크박스 포함 */
        .task-box {
          height: 70px;
          border-radius: 14px;
          background: #fff;
          border: 1px solid rgba(0, 0, 0, 0.12);
          padding: 10px 12px;

          display: grid;
          grid-template-columns: 56px 1fr 34px; /* meta | title | checkbox */
          column-gap: 10px;
          align-items: center;

          width: 100%;
          box-sizing: border-box;
        }
        .task-meta { font-size: 14px; font-weight: 800; color: rgba(0, 0, 0, 0.45); }
        .task-title { font-size: 16px; font-weight: 900; color: #111; }

        .checkbox-wrap {
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          cursor: pointer;
          justify-self: end;
        }
        .checkbox-wrap input { display: none; }
        .checkbox-ui {
          width: 22px;
          height: 22px;
          border-radius: 6px;
          border: 2px solid rgba(0, 0, 0, 0.35);
          background: #fff;
        }
        .checkbox-wrap input:checked + .checkbox-ui {
          background: rgba(0, 0, 0, 0.2);
        }

        .teamplace-room-btn {
          width: min(420px, 92vw);
          margin: 10px auto 8px;
          height: 60px;
          border-radius: 14px;
          border: 2px solid rgba(255, 255, 255, 0.75);
          background: var(--brand-teal);
          color: #fff;
          font-weight: 900;
          font-size: 18px;
          display: block;
          box-shadow: 0 6px 14px rgba(0, 0, 0, 0.18);
        }
        .teamplace-room-btn:disabled{ opacity: .6; cursor: not-allowed; }

        .room-code {
          width: min(420px, 92vw);
          margin: 0 auto 84px;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          color: rgba(255, 255, 255, 0.85);
          font-weight: 800;
        }
        .room-code-label { opacity: 0.9; }
        .room-code-value { letter-spacing: 0.5px; }

        /* ✅ 방 나가기 모달 */
        .leave-modal-overlay{
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.45);
          display: grid;
          place-items: center;
          z-index: 9999;
          padding: 20px;
        }
        .leave-modal{
          width: min(560px, 92vw);
          background: #fff;
          border-radius: 20px;
          padding: 22px 18px 18px;
          box-shadow: 0 14px 28px rgba(0,0,0,0.22);
        }
        .leave-modal-title{
          font-size: 20px;
          font-weight: 900;
          color: #111;
          text-align: center;
          margin: 2px 0 8px;
          letter-spacing: -0.2px;
        }
        .leave-modal-desc{
          font-size: 14px;
          font-weight: 700;
          color: rgba(0,0,0,0.55);
          text-align: center;
          margin: 0 0 16px;
        }
        .leave-modal-actions{
          display: flex;
          gap: 12px;
          justify-content: center;
        }
        .leave-btn{
          min-width: 140px;
          height: 46px;
          border-radius: 12px;
          border: 0;
          font-weight: 900;
          font-size: 16px;
          cursor: pointer;
        }
        .leave-btn-cancel{ background: #e9e9e9; color: #111; }
        .leave-btn-confirm{ background: var(--brand-teal); color: #fff; }
        .leave-btn:disabled{ opacity: .6; cursor: not-allowed; }
      `}</style>

      <BackButton />

      <div className="home-header">
        <img className="home-logo" src="/images/logo.png" alt="FLOORIDA" />
      </div>

      <div className="elevator-wrapper">
        <div className={`elevator ${isMoving ? "elevator-moving" : ""}`}>
          <div
            className="elevator-inside"
            style={{ backgroundImage: `url(${elevatorInsideImg})` }}
          >
            {characterImageUrl && (
              <img
                src={characterImageUrl}
                alt="캐릭터"
                className="elevator-character"
              />
            )}
          </div>
          <ElevatorDoor isOpen={isOpen} />
        </div>
      </div>

      <div className="teamplace-actions">
        <button
          className="teamplace-btn"
          onClick={() => navigate("/teamcalendar")}
        >
          팀 캘린더
        </button>
        <button className="teamplace-btn">팀 게시판</button>
      </div>

      <div className="card dday-card">
        <div className="dday-left">프로젝트 마감까지</div>
        <div className="dday-right">
          {dday === null ? "-" : `D-${Math.max(dday, 0)}`}
        </div>
      </div>

      <QuestList
        progress={todayProgress.percent}
        done={todayProgress.done}
        total={todayProgress.total}
      />

      <div className="card everyone-card">
        <div className="section-title">모두의 할 일</div>

        <div className="everyone-list">
          {teamMembers.map((m) => (
            <div className="everyone-row" key={m.id}>
              <div className="avatar-placeholder" aria-hidden="true" />

              {/* ✅ 오른쪽 묶음(이름 + task-box) */}
              <div>
                <div className="member-name">{m.username}</div>

                <div className="task-box">
                  <div className="task-meta">D-7</div>
                  <div className="task-title">서버 구축</div>

                  {/* ✅ 체크박스가 task-box 안으로 */}
                  <label className="checkbox-wrap">
                    <input
                      type="checkbox"
                      checked={!!checkedMap[m.id]}
                      onChange={() => toggleMemberCheck(m.id)}
                    />
                    <span className="checkbox-ui" />
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ✅ 방 관리(OWNER) / 방 나가기(MEMBER) */}
      {myRole &&
        (isOwner ? (
          <button
            className="teamplace-room-btn"
            onClick={() => navigate(`/roommanagement/${teamId}`)}
          >
            방 관리
          </button>
        ) : (
          <button
            className="teamplace-room-btn"
            disabled={leaving}
            onClick={() => setLeaveOpen(true)}
          >
            방 나가기
          </button>
        ))}

      <div className="room-code">
        <div className="room-code-label">방 입장코드</div>
        <div className="room-code-value">{roomCode}</div>
      </div>

      <Navbar onNavigate={(key) => key === "home" && navigate("/home")} />

      {/* ✅ 방 나가기 모달 */}
      {leaveOpen && (
        <div
          className="leave-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="방 나가기 확인"
          onClick={() => !leaving && setLeaveOpen(false)}
        >
          <div className="leave-modal" onClick={(e) => e.stopPropagation()}>
            <div className="leave-modal-title">방 나가기</div>
            <div className="leave-modal-desc">정말 방을 나가시겠습니까?</div>

            <div className="leave-modal-actions">
              <button
                className="leave-btn leave-btn-cancel"
                disabled={leaving}
                onClick={() => setLeaveOpen(false)}
              >
                취소
              </button>
              <button
                className="leave-btn leave-btn-confirm"
                disabled={leaving}
                onClick={confirmLeave}
              >
                {leaving ? "나가는 중..." : "나가기"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
