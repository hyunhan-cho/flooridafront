// src/pages/TeamPlaceHome.jsx
import React, { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ElevatorDoor from "../components/ElevatorDoor.jsx";
import QuestList from "../components/QuestList.jsx";
import BackButton from "../components/BackButton.jsx";
import Navbar from "../components/Navbar.jsx";
import CoinPopup from "../components/CoinPopup.jsx";

import {
  getMyCharacter,
  getTeam,
  leaveTeam,
  getTeamFloors,
  completeTeamFloor,
  cancelTeamFloor,
} from "../services/api.js";
import { AUTH_TOKEN_KEY, API_BASE_URL } from "../config.js";

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

// "YYYY-MM-DD" → 로컬 날짜로 안전하게 Date 만들기 (타임존 이슈 방지)
function parseYmdToLocalDate(ymd) {
  if (!ymd || typeof ymd !== "string") return null;
  const [y, m, d] = ymd.split("-").map((v) => Number(v));
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d); // 로컬 00:00 기준
}

/** ✅ 팀 캐릭터용 requestJson (JoinedTeamPlace랑 동일한 패턴) */
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

/** ✅ 캐릭터 썸네일(모두의 할 일 좌측) */
function CharacterThumb({ user }) {
  // equippedItems 비어있으면(백에서 기본 FACE를 안 준 케이스) → placeholder
  const items = Array.isArray(user?.equippedItems) ? user.equippedItems : [];
  if (!user || items.length === 0) {
    return <div className="member-avatarPlaceholder" aria-hidden="true" />;
  }

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
  const VIEW = 52; // ✅ member-col 폭 56에 맞춰 살짝 작게
  const scale = VIEW / LOGICAL;

  return (
    <div className="member-avatar">
      <div className="member-avatarViewport" aria-hidden="true">
        <div
          className="member-avatarStage"
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

export default function TeamPlaceHome() {
  const navigate = useNavigate();
  const { teamId: teamIdParam } = useParams();
  const teamId = Number(teamIdParam);

  const TEAM_LEVEL_CACHE_KEY = `teamLevel:${teamId}`;

  const [isOpen, setIsOpen] = useState(true);
  const [isMoving, setIsMoving] = useState(false);

  // ✅ 애니메이션 기준 currentFloor는 1 유지 OK
  const [currentFloor, setCurrentFloor] = useState(1);

  // ✅ 초기 로딩 동안 '1' 깜빡임 제거: null이면 숫자 숨김
  const [teamLevel, setTeamLevel] = useState(null);

  const [characterImageUrl, setCharacterImageUrl] = useState(null);
  const [teamLoading, setTeamLoading] = useState(true);

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

  const [joinCode, setJoinCode] = useState("");
  // ✅ 팀 마감일(endDate) 기반 D-day
  const [teamEndDate, setTeamEndDate] = useState(null);

  // ✅ myRole
  const [myRole, setMyRole] = useState(null);
  const isOwner = (myRole ?? "").toLowerCase() === "owner";

  // ✅ leave
  const [leaving, setLeaving] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);

  // ✅ 팀 멤버 캐릭터 맵: userId -> user(character payload)
  const [charByUserId, setCharByUserId] = useState({});

  // ✅ 코인 팝업
  const [coinPopupOpen, setCoinPopupOpen] = useState(false);
  const [coinPopupAmount, setCoinPopupAmount] = useState(10);

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

  // ✅ state 타이밍 꼬임 방지용 ref
  const currentFloorRef = useRef(1);
  const lastAppliedLevelRef = useRef(null);
  const didInitFromServerRef = useRef(false);

  useEffect(() => {
    currentFloorRef.current = currentFloor;
  }, [currentFloor]);

  // ✅ 서버 teamLevel 적용
  // - 첫 진입/새로고침: 애니메이션 없이 currentFloor만 세팅
  // - 완료/취소 액션으로 변할 때: 애니메이션 허용
  const applyTeamLevel = (nextLevel, { animate = true } = {}) => {
    const raw = Number(nextLevel);
    if (!Number.isFinite(raw) || raw < 1) return;

    // 같은 레벨이면 아무것도 안 함 (새로고침 액션 방지)
    if (lastAppliedLevelRef.current === raw) return;
    lastAppliedLevelRef.current = raw;

    // ✅ 표시값 세팅
    setTeamLevel(raw);

    // ✅ 캐시 저장(다음 진입 때 1 깜빡임 방지)
    try {
      if (Number.isFinite(teamId)) {
        localStorage.setItem(`teamLevel:${teamId}`, String(raw));
      }
    } catch (_) {}

    const now = currentFloorRef.current;

    const first = !didInitFromServerRef.current;
    if (first) didInitFromServerRef.current = true;

    if (raw !== now) {
      // 첫 로딩은 무조건 애니메이션 X
      if (first || !animate) setCurrentFloor(raw);
      else goToFloor(raw);
    }
  };

  // ✅ teamId 바뀌면 refs 초기화 + 로딩 중 숫자 숨김(null)
  useEffect(() => {
    didInitFromServerRef.current = false;
    lastAppliedLevelRef.current = null;

    // ✅ 1로 리셋하지 말고 숨김 처리
    setTeamLevel(null);

    // 애니메이션 기준은 유지
    setCurrentFloor(1);

    // 캐릭터 맵도 초기화
    setCharByUserId({});
  }, [teamId]);

  // ✅ 캐시된 teamLevel이 있으면 서버 오기 전 먼저 보여주기
  useEffect(() => {
    if (!Number.isFinite(teamId)) return;

    try {
      const cached = localStorage.getItem(TEAM_LEVEL_CACHE_KEY);
      const n = Number(cached);
      if (Number.isFinite(n) && n >= 1) {
        setTeamLevel(n);
      }
    } catch (_) {}
  }, [teamId, TEAM_LEVEL_CACHE_KEY]);

  // ✅ teamId로 팀 정보 로드 (myRole, joinCode, level, endDate)
  useEffect(() => {
    let ignore = false;

    const loadTeam = async () => {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      if (!token || !Number.isFinite(teamId)) return;

      try {
        setTeamLoading(true);

        const team = await getTeam(teamId);
        if (ignore) return;

        // ✅ role
        setMyRole(team?.myRole ?? null);

        // ✅ joinCode
        setJoinCode(team?.joinCode ?? "");

        // ✅ 팀 마감일(endDate)
        setTeamEndDate(team?.endDate ?? null);

        // ✅ team.level -> teamLevel
        if (team?.level != null) {
          applyTeamLevel(team.level, { animate: false });
        }
      } catch (e) {
        if (e?.status === 401) return navigate("/login", { replace: true });
        navigate("/home", { replace: true });
      } finally {
        if (!ignore) setTeamLoading(false);
      }
    };

    loadTeam();
    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId, navigate]);

  // ✅ 팀 할 일 목록 + teamLevel 로드 (새 스펙 대응: { teamLevel, floors })
  useEffect(() => {
    let ignore = false;

    const loadTeamFloors = async () => {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      if (!token || !Number.isFinite(teamId)) return;

      try {
        setFloorsLoading(true);
        setFloorsError("");

        const data = await getTeamFloors(teamId);

        // ✅ 새 스펙 파싱
        const nextTeamLevel =
          data && typeof data === "object" && !Array.isArray(data)
            ? data.teamLevel
            : null;

        const list =
          data &&
          typeof data === "object" &&
          !Array.isArray(data) &&
          Array.isArray(data.floors)
            ? data.floors
            : Array.isArray(data)
            ? data
            : [];

        // ✅ 첫 진입/새로고침에서는 애니메이션 없이 층만 맞춤
        if (nextTeamLevel != null) {
          applyTeamLevel(nextTeamLevel, { animate: false });
        }

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId, navigate]);

  // ✅ 팀 멤버 캐릭터 로드 (teamId 당 1번)
  useEffect(() => {
    let ignore = false;

    const loadTeamCharacters = async () => {
      if (!Number.isFinite(teamId)) return;

      try {
        const chars = await requestJson(
          "GET",
          `/api/items/${teamId}/characters`
        );
        if (ignore) return;

        const arr = Array.isArray(chars) ? chars : [];
        const map = {};
        arr.forEach((u) => {
          if (u?.userId != null) map[u.userId] = u;
        });
        setCharByUserId(map);
      } catch (e) {
        if (e?.status === 401) return navigate("/login", { replace: true });
        // 캐릭터는 “없어도 화면은 돌아가야” 해서 조용히 비움
        if (!ignore) setCharByUserId({});
      }
    };

    loadTeamCharacters();
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

  // ✅ 캐릭터 로드 (내 캐릭터: 엘리베이터)
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

  // ✅ dueDate가 있으면 "오늘 23:59:59" 기준으로 기한 체크 (fallback)
  const isLateByClient = (dueDate) => {
    if (!dueDate) return false;
    const now = new Date();

    let d = null;
    if (typeof dueDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
      d = parseYmdToLocalDate(dueDate);
    } else {
      d = new Date(dueDate);
    }
    if (!(d instanceof Date) || isNaN(d.getTime())) return false;

    const endOfDay = new Date(
      d.getFullYear(),
      d.getMonth(),
      d.getDate(),
      23,
      59,
      59,
      999
    );
    return now > endOfDay;
  };

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
      if (nextChecked) res = await completeTeamFloor(teamFloorId);
      else res = await cancelTeamFloor(teamFloorId);

      // ✅ 코인 지급 조건(완료만)
      if (nextChecked) {
        const awarded = Number(res?.coinsAwarded) || 0;

        const isAssigned = row?.userId != null; // 미지정이면 지급 X
        const lateFromServer =
          typeof res?.late === "boolean"
            ? res.late
            : isLateByClient(row?.dueDate);

        const notAlreadyCompleted = res?.alreadyCompleted === false;

        // ✅ 담당자 있음 + 기한 내 + 실제 지급 + 중복완료 아님
        if (
          isAssigned &&
          !lateFromServer &&
          awarded > 0 &&
          notAlreadyCompleted
        ) {
          setCoinPopupAmount(awarded); // 보통 10
          setCoinPopupOpen(true);
        }
      }
      // ✅ 취소 시 코인 차감은 백에서 처리 (팝업은 안 띄움)

      // ✅ 완료/취소에서는 애니메이션 허용
      if (res?.teamLevel != null) {
        applyTeamLevel(res.teamLevel, { animate: true });
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

        .everyone-row {
          display: grid;
          grid-template-columns: 56px 1fr;
          align-items: center;
          gap: 12px;
        }

        /* 왼쪽: 캐릭터 + 이름(아래) */
        .member-col {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
        }

        /* ✅ 캐릭터 자리 */
        .member-avatar{
          width: 56px;
          height: 56px;
          display: grid;
          place-items: center;
        }
        /* ✅ 아이템이 살짝 밖으로 나가도 안 잘리게 */
        .member-avatarViewport{
          position: relative;
          width: 56px;
          height: 56px;
          overflow: visible;
        }
        .member-avatarStage{
          position: relative;
        }
        /* ✅ equippedItems 비었을 때 placeholder */
        .member-avatarPlaceholder{
          width: 44px;
          height: 44px;
          border-radius: 999px;
          background: rgba(0,0,0,0.08);
        }

        .member-name {
          margin-top: 6px;
          font-size: 9px;
          font-weight: 800;
          color: #222;
          line-height: 1;
          max-width: 56px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        /* 오른쪽: D-day(위) + 할일(아래) + 체크박스(오른쪽) */
        .task-box {
          height: 70px;
          border-radius: 14px;
          background: #fff;
          border: 1px solid rgba(0, 0, 0, 0.12);
          padding: 10px 12px;

          display: grid;
          grid-template-columns: 1fr 34px;
          align-items: center;
          column-gap: 10px;

          width: 100%;
          box-sizing: border-box;
        }

        .task-left {
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 4px;
          min-width: 0;
        }

        .task-meta {
          font-size: 14px;
          font-weight: 900;
          color: rgba(0, 0, 0, 0.45);
        }

        .task-title {
          font-size: 16px;
          font-weight: 900;
          color: #111;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* ✅ D+1부터 빨간 처리 */
        .task-box--overdue{
          background: rgba(255, 70, 70, 0.18);
          border-color: rgba(255, 70, 70, 0.65);
        }
        .task-meta--overdue{
          color: rgba(220, 38, 38, 0.95);
        }

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

        /* ✅ 프로젝트 마감 D-day 카드 */
        .dday-card {
          width: min(420px, 92vw);
          margin: 12px auto 10px;
          background: #f4f4f4;
          border-radius: 14px;
          box-shadow: 0 8px 18px rgba(0, 0, 0, 0.18);
          padding: 14px 16px;

          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .dday-title {
          font-size: 20px;
          font-weight: 900;
          color: #111;
          letter-spacing: -0.3px;
        }

        .dday-value {
          font-size: 34px;
          font-weight: 1000;
          color: #111;
          letter-spacing: -1px;
        }

        /* ✅ D+면 좀 위험색(원하면 빼도 됨) */
        .dday-value--over {
          color: rgba(220, 38, 38, 0.95);
        }
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
            {/* ✅ teamLevel이 null이면 숫자 숨김 */}
            <span className="floor-indicator-number">
              {teamLevel == null ? "" : teamLevel}
            </span>
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

      {/* ✅ 프로젝트 마감 D-day (team.endDate 기준) - 로딩 중에도 카드 노출 */}
      {(() => {
        const end = parseYmdToLocalDate(teamEndDate);
        const diff = end ? calcDday(end) : null;

        const label = teamLoading
          ? "D-?"
          : diff == null
          ? "-"
          : formatDdayLabel(diff);

        const isOver = !teamLoading && diff != null && diff < 0;

        return (
          <div className="dday-card" aria-label="프로젝트 마감 D-day">
            <div className="dday-title">프로젝트 마감까지</div>
            <div className={`dday-value ${isOver ? "dday-value--over" : ""}`}>
              {label}
            </div>
          </div>
        );
      })()}

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

              const userChar = r.userId ? charByUserId?.[r.userId] : null;

              return (
                <div className="everyone-row" key={r.rowKey}>
                  {/* ✅ 왼쪽: 캐릭터 + 이름(아래) */}
                  <div className="member-col">
                    <CharacterThumb user={userChar} />
                    <div className="member-name">{r.username}</div>
                  </div>

                  {/* 오른쪽: 테스크 박스 */}
                  <div
                    className={`task-box ${
                      isOverdue ? "task-box--overdue" : ""
                    }`}
                    role="group"
                    aria-label="팀 할 일"
                  >
                    <div className="task-left">
                      <div
                        className={`task-meta ${
                          isOverdue ? "task-meta--overdue" : ""
                        }`}
                      >
                        {metaText}
                      </div>
                      <div className="task-title">{r.title}</div>
                    </div>

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
        <div className="room-code-value">{joinCode || "-"}</div>
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

      {/* ✅ 코인 팝업 */}
      {coinPopupOpen && (
        <CoinPopup
          coinAmount={coinPopupAmount}
          onClose={() => setCoinPopupOpen(false)}
        />
      )}
    </div>
  );
}
