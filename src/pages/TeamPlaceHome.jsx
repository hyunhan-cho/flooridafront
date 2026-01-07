// src/pages/TeamPlaceHome.jsx
import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ElevatorDoor from "../components/ElevatorDoor.jsx";
import QuestList from "../components/QuestList.jsx";
import BackButton from "../components/BackButton.jsx";
import Navbar from "../components/Navbar.jsx";
import { floors } from "../constants/floors.js"; // ✅ 층 clamp용
import {
  getMyCharacter,
  getTeam,
  leaveTeam,
  getTeamFloors,
  completeTeamFloor,
  cancelTeamFloor,
} from "../services/api.js";
import { AUTH_TOKEN_KEY } from "../config.js";

import "../App.css";

// ✅ 홈이 쓰는 이미지 그대로
import floorBoardImg from "../assets/img/board 1.png";
import backgroundImg from "../assets/img/image 20.png";

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

function formatDdayLabel(diff) {
  if (diff === 0) return "D-DAY";
  if (diff > 0) return `D-${diff}`;
  return `D+${Math.abs(diff)}`;
}

const elevatorInsideImg = "/images/frame.png";

// ✅ localStorage key (팀별 저장)
const floorKey = (teamId) => `teamplace:${teamId}:currentFloor`;

export default function TeamPlaceHome() {
  const navigate = useNavigate();
  const { teamId: teamIdParam } = useParams();
  const teamId = Number(teamIdParam);

  const [isOpen, setIsOpen] = useState(true);
  const [isMoving, setIsMoving] = useState(false);
  const [currentFloor, setCurrentFloor] = useState(1);
  const [characterImageUrl, setCharacterImageUrl] = useState(null);

  // ✅ 오늘의 진행도(=팀 할일 진행도로 쓰기)
  const [todayProgress, setTodayProgress] = useState({
    percent: 0,
    done: 0,
    total: 0,
  });

  // ✅ 모두의 할 일 (서버 데이터)
  const [teamFloors, setTeamFloors] = useState([]);
  const [floorsLoading, setFloorsLoading] = useState(true);
  const [floorsError, setFloorsError] = useState("");

  // ✅ 체크박스 상태 (rowKey 기반)
  const [checkedMap, setCheckedMap] = useState({});
  const [savingMap, setSavingMap] = useState({});

  const roomCode = "23572633";

  // ✅ myRole
  const [myRole, setMyRole] = useState(null);
  const isOwner = (myRole ?? "").toLowerCase() === "owner";

  // ✅ leave
  const [leaving, setLeaving] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);

  // ✅ 홈.jsx랑 같은 이동 함수(엘리베이터 애니메이션)
  const goToFloor = (targetFloor) => {
    if (isMoving || !isOpen || currentFloor === targetFloor) return;
    setIsOpen(false);
    setTimeout(() => setIsMoving(true), 1500);
    setTimeout(() => {
      setIsMoving(false);
      setCurrentFloor(targetFloor);
      setTimeout(() => setIsOpen(true), 500);
    }, 3500);
  };

  // ✅ 층수 clamp + state/localStorage 동기화
  const applyTeamLevel = (teamLevel) => {
    const raw = Number(teamLevel);
    if (!Number.isFinite(raw) || raw < 1) return;

    const maxFloor = Object.keys(floors).length || 1;
    const next = Math.max(1, Math.min(raw, maxFloor));

    localStorage.setItem(floorKey(teamId), String(next));
    if (next !== currentFloor) goToFloor(next);
    else setCurrentFloor(next);
  };

  // ✅ 초기 층수 localStorage에서 로드 (getTeam에 teamLevel 없으니까 fallback)
  useEffect(() => {
    if (!Number.isFinite(teamId)) return;

    const saved = Number(localStorage.getItem(floorKey(teamId)));
    const n = Number.isFinite(saved) && saved >= 1 ? saved : 1;

    setCurrentFloor(n);
    localStorage.setItem(floorKey(teamId), String(n));
  }, [teamId]);

  // ✅ teamId로 팀 정보 로드 (myRole)
  useEffect(() => {
    const loadTeam = async () => {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      if (!token || !Number.isFinite(teamId)) return;

      try {
        const team = await getTeam(teamId);
        setMyRole(team?.myRole ?? null);

        // ⚠️ teamLevel이 아직 없으니 여기선 적용 안 함.
        // 나중에 team.teamLevel 들어오면:
        // if (team?.teamLevel) applyTeamLevel(team.teamLevel);
      } catch (e) {
        if (e?.status === 401) return navigate("/login", { replace: true });
        navigate("/home", { replace: true });
      }
    };
    loadTeam();
  }, [teamId, navigate]);

  // ✅ 팀 할 일 목록 로드
  useEffect(() => {
    let ignore = false;

    const loadTeamFloors = async () => {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      if (!token || !Number.isFinite(teamId)) return;

      try {
        setFloorsLoading(true);
        setFloorsError("");

        const data = await getTeamFloors(teamId);
        const list = Array.isArray(data) ? data : [];

        if (!ignore) setTeamFloors(list);
      } catch (e) {
        if (e?.status === 401) return navigate("/login", { replace: true });
        if (!ignore)
          setFloorsError(e?.message ?? "팀 할 일을 불러오지 못했어요.");
      } finally {
        if (!ignore) setFloorsLoading(false);
      }
    };

    loadTeamFloors();
    return () => {
      ignore = true;
    };
  }, [teamId, navigate]);

  // ✅ 렌더용 rows: "floor + assignee" 조합으로 펼치기
  const taskRows = useMemo(() => {
    const list = Array.isArray(teamFloors) ? teamFloors : [];
    const rows = [];

    for (const f of list) {
      const assignees = Array.isArray(f?.assignees) ? f.assignees : [];

      // 담당자 없는 할 일도 표시
      if (assignees.length === 0) {
        rows.push({
          rowKey: `${f.teamFloorId}-none`,
          teamFloorId: f.teamFloorId,
          userId: null,
          username: "미지정",
          title: f.title ?? "(제목 없음)",
          dueDate: f.dueDate ?? null,
          completed: !!f.completed,
        });
        continue;
      }

      for (const a of assignees) {
        rows.push({
          rowKey: `${f.teamFloorId}-${a.userId}`,
          teamFloorId: f.teamFloorId,
          userId: a.userId,
          username: a.username ?? `user-${a.userId}`,
          title: f.title ?? "(제목 없음)",
          dueDate: f.dueDate ?? null,
          completed: !!f.completed, // ✅ 팀 완료라 동일 task는 동일 상태
        });
      }
    }
    return rows;
  }, [teamFloors]);

  // ✅ 팀 진행도 = floors 단위 (분모: floor 수, 분자: completed true 수)
  const teamProgress = useMemo(() => {
    const list = Array.isArray(teamFloors) ? teamFloors : [];
    const total = list.length;
    const done = list.filter((f) => !!f?.completed).length;
    const percent = total > 0 ? Math.round((done / total) * 100) : 0;
    return { percent, done, total };
  }, [teamFloors]);

  useEffect(() => {
    setTodayProgress(teamProgress);
  }, [teamProgress]);

  // ✅ 체크박스 초기값 = 서버 completed
  useEffect(() => {
    const next = {};
    taskRows.forEach((r) => {
      next[r.rowKey] = !!r.completed;
    });
    setCheckedMap(next);
  }, [taskRows]);

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

  // ✅ 체크 토글 + 서버 반영(complete/cancel)
  const onToggleTask = async (row) => {
    const { rowKey, teamFloorId } = row;

    if (savingMap[rowKey]) return;

    const prevChecked = !!checkedMap[rowKey];
    const nextChecked = !prevChecked;

    // UI 낙관적 업데이트
    setCheckedMap((prev) => ({ ...prev, [rowKey]: nextChecked }));
    setSavingMap((prev) => ({ ...prev, [rowKey]: true }));
    setFloorsError("");

    try {
      let res;
      if (nextChecked) {
        // ✅ 응답: { alreadyCompleted, levelUp, teamLevel }
        res = await completeTeamFloor(teamFloorId);
      } else {
        // ✅ (언니 말대로) cancel도 teamLevel 준다면 여기서도 반영 가능
        res = await cancelTeamFloor(teamFloorId);
      }

      // ✅ 팀 레벨 반영 (서버가 최신 teamLevel 주는 경우)
      if (res?.teamLevel != null) {
        applyTeamLevel(res.teamLevel);
      }

      // ✅ teamFloors completed 동기화(팀 단위)
      setTeamFloors((prev) =>
        prev.map((f) =>
          f.teamFloorId === teamFloorId ? { ...f, completed: nextChecked } : f
        )
      );
    } catch (e) {
      // 실패 롤백
      setCheckedMap((prev) => ({ ...prev, [rowKey]: prevChecked }));

      if (e?.status === 401) return navigate("/login", { replace: true });
      if (e?.status === 403)
        return setFloorsError("권한이 없어요. (방장/권한 확인 필요)");
      setFloorsError(e?.message ?? "완료 상태 변경에 실패했어요.");
    } finally {
      setSavingMap((prev) => ({ ...prev, [rowKey]: false }));
    }
  };

  // ✅ 방 나가기
  const confirmLeave = async () => {
    if (!Number.isFinite(teamId)) return;

    try {
      setLeaving(true);
      await leaveTeam(teamId);
      setLeaveOpen(false);
      navigate("/joinedteamplace", { replace: true });
    } catch (e) {
      if (e?.status === 401) return navigate("/login", { replace: true });
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

        .everyone-card .section-title {
          font-size: 22px;
          font-weight: 900;
          margin-bottom: 12px;
        }
        .everyone-list { display: grid; gap: 14px; }

        .teamplace-empty{
          font-size: 14px;
          font-weight: 800;
          color: rgba(0,0,0,0.5);
          padding: 6px 2px;
        }
        .teamplace-error{
          font-size: 13px;
          font-weight: 900;
          color: rgba(220,38,38,.92);
          padding: 6px 2px;
        }

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

        .task-box {
          height: 70px;
          border-radius: 14px;
          background: #fff;
          border: 1px solid rgba(0, 0, 0, 0.12);
          padding: 10px 12px;
          display: grid;
          grid-template-columns: 64px 1fr 34px;
          column-gap: 10px;
          align-items: center;
          width: 100%;
          box-sizing: border-box;
        }

        /* ✅ D+1부터 빨간 처리 */
        .task-box--overdue{
          background: rgba(255, 70, 70, 0.18);
          border-color: rgba(255, 70, 70, 0.65);
        }
        .task-meta--overdue{
          color: rgba(220, 38, 38, 0.95);
        }

        .task-meta { font-size: 14px; font-weight: 900; color: rgba(0, 0, 0, 0.45); }
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

      {/* ✅ 층수 표시판 + 배경 + 엘리베이터 */}
      <div className="elevator-wrapper">
        <div className={`elevator ${isMoving ? "elevator-moving" : ""}`}>
          <div className="floor-indicator-box">
            <img
              src={floorBoardImg}
              alt="층수 표시판"
              className="floor-indicator-bg"
            />
            <span className="floor-indicator-number">{currentFloor}</span>
          </div>

          <div className="floor-scene">
            <img
              src={backgroundImg}
              alt="배경"
              className="floor-background-img"
            />
          </div>

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
          onClick={() => navigate(`/teamcalendar/${teamId}`)}
        >
          팀 캘린더
        </button>
        <button className="teamplace-btn">팀 게시판</button>
      </div>

      <QuestList
        progress={todayProgress.percent}
        done={todayProgress.done}
        total={todayProgress.total}
      />

      <div className="card everyone-card">
        <div className="section-title">모두의 할 일</div>

        <div className="everyone-list">
          {floorsLoading ? (
            <div className="teamplace-empty">불러오는 중...</div>
          ) : floorsError ? (
            <div className="teamplace-error">{floorsError}</div>
          ) : taskRows.length === 0 ? (
            <div className="teamplace-empty">아직 팀 할 일이 없어요.</div>
          ) : (
            taskRows.map((r) => {
              const diff = r.dueDate ? calcDday(new Date(r.dueDate)) : null;
              const metaText = diff == null ? "-" : formatDdayLabel(diff);
              const isOverdue = diff != null && diff < 0;

              const busy = !!savingMap[r.rowKey];

              return (
                <div className="everyone-row" key={r.rowKey}>
                  <div className="avatar-placeholder" aria-hidden="true" />

                  <div>
                    <div className="member-name">{r.username}</div>

                    <div
                      className={`task-box ${
                        isOverdue ? "task-box--overdue" : ""
                      }`}
                    >
                      <div
                        className={`task-meta ${
                          isOverdue ? "task-meta--overdue" : ""
                        }`}
                      >
                        {metaText}
                      </div>

                      <div className="task-title">{r.title}</div>

                      <label
                        className="checkbox-wrap"
                        style={{
                          opacity: busy ? 0.55 : 1,
                          pointerEvents: busy ? "none" : "auto",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={!!checkedMap[r.rowKey]}
                          onChange={() => onToggleTask(r)}
                        />
                        <span className="checkbox-ui" />
                      </label>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ✅ 방 관리 / 방 나가기 */}
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
