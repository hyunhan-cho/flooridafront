import React, { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ElevatorDoor from "../components/ElevatorDoor.jsx";
import QuestList from "../components/QuestList.jsx";
import BackButton from "../components/BackButton.jsx";
import Navbar from "../components/Navbar.jsx";
import CoinPopup from "../components/CoinPopup.jsx";
import CharacterDisplay from "../components/CharacterDisplay.jsx";
import { getTeamMembersBadges } from "../services/badge.js";

import {
  getTeam,
  leaveTeam,
  getTeamFloors,
  completeTeamFloor,
  cancelTeamFloor,
} from "../services/api.js";
import { AUTH_TOKEN_KEY, API_BASE_URL } from "../config.js";

import "../App.css";
import baseChar from "../assets/ch/cha_1.png";

// ✅ 홈이 쓰는 이미지 그대로
import floorBoardImg from "../assets/img/board 1.png";
import FloorBackground from "../components/FloorBackground.jsx";
import { useTeamStore } from "../store/teamStore.js"; // ✅ Store import

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

const BASE_W = 114;
const BASE_H = 126;
function toNum(v) {
  if (v === undefined || v === null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const t = v.trim();
    if (!t) return null;
    const n = parseFloat(t.replace(/,/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function pick(obj, ...keys) {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return null;
}

// ✅ API Response -> CSS Style 변환 (Customize.jsx 로직 이식)
function buildLayerStyleFromServer(raw, meta) {
  const pickVal = (...vals) => {
    for (const v of vals) {
      if (v !== undefined && v !== null && v !== "") return v;
    }
    return null;
  };

  const xRaw = pickVal(
    raw?.offsetX, raw?.offset_x, raw?.x, raw?.posX, raw?.left,
    meta?.offsetX, meta?.offset_x, meta?.x, meta?.posX, meta?.left
  );
  const yRaw = pickVal(
    raw?.offsetY, raw?.offset_y, raw?.y, raw?.posY, raw?.top,
    meta?.offsetY, meta?.offset_y, meta?.y, meta?.posY, meta?.top
  );
  const wRaw = pickVal(raw?.width, raw?.itemWidth, raw?.w, meta?.width);
  const hRaw = pickVal(raw?.height, raw?.itemHeight, raw?.h, meta?.height);
  const sRaw = pickVal(raw?.scale, raw?.size, meta?.scale, meta?.size);

  const x = toNum(xRaw);
  const y = toNum(yRaw);
  const w = toNum(wRaw);
  const h = toNum(hRaw);

  const sNum = toNum(sRaw);
  const scale = sNum == null ? null : sNum > 10 ? sNum / 100 : sNum;

  const style = { position: "absolute" }; // 기본 absolute
  if (x != null) style.left = `${x}px`;
  if (y != null) style.top = `${y}px`;

  const looksLikeRatio = (n) => n != null && n > 0 && n <= 3;
  if (w != null && !looksLikeRatio(w)) style.width = `${w}px`;
  if (h != null && !looksLikeRatio(h)) style.height = `${h}px`;

  if (
    (w == null || h == null || looksLikeRatio(w) || looksLikeRatio(h)) &&
    scale != null &&
    scale !== 1
  ) {
    style.transform = `scale(${scale})`;
    style.transformOrigin = "top left";
  }

  style.imageRendering = "pixelated";
  style.pointerEvents = "none";
  style.userSelect = "none";
  style.objectFit = "contain"; // ✅ Customize.css .cust-layer-img 모방하여 비율 유지

  // ✅ Customize.css 기본값 적용 (좌표/크기 없을 경우 캔버스 꽉 채우기)
  if (style.width === undefined) style.width = "100%";
  if (style.height === undefined) style.height = "100%";
  if (style.left === undefined) style.left = 0;
  if (style.top === undefined) style.top = 0;

  return style;
}

const elevatorInsideImg = "/images/frame.png";

// ... (중략) ...

/** ✅ 캐릭터 썸네일(모두의 할 일 좌측) */
function CharacterThumb({ user, badge }) {
  const items = Array.isArray(user?.equippedItems) ? user.equippedItems : [];

  // ✅ [ADD] 배지 이미지 소스 후보들
  const badgeSrc =
    badge?.imageUrl ??
    badge?.imgUrl ??
    badge?.badgeImageUrl ??
    badge?.iconUrl ??
    null;

  // ✅ 기존 로직 유지 + (배지 오버레이만 추가)
  // [MODIFIED] Fallback to base character if no specific items, instead of gray placeholder
  if (!user || (!user.imageUrl && items.length === 0)) {
    // Try to use a base image if available properties exist, otherwise placeholder
    const baseImg = user?.imageUrl ?? user?.imgUrl ?? baseChar;

    if (baseImg) {
      return (
        <div className="member-avatar">
          <div className="member-avatarViewport" aria-hidden="true">
            <img
              src={baseImg}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
            {badgeSrc && (
              <img
                src={badgeSrc}
                alt=""
                style={{
                  ...buildLayerStyleFromServer(badge, badge),
                  zIndex: 9999,
                }}
              />
            )}
          </div>
        </div>
      )
    }

    return (
      <div className="member-avatar">
        <div className="member-avatarViewport" aria-hidden="true">
          <div className="member-avatarPlaceholder" aria-hidden="true" />
          {badgeSrc && (
            <img
              src={badgeSrc}
              alt=""
              style={{
                position: "absolute",
                right: -2,
                bottom: -2,
                width: 18,
                height: 18,
                pointerEvents: "none",
                userSelect: "none",
                imageRendering: "pixelated",
                zIndex: 9999,
              }}
            />
          )}
        </div>
      </div>
    );
  }

  const order = {
    BACKGROUND: 0,
    BODY: 1,
    CLOTH: 2,
    HAT: 2.5,
    HAIR: 3,
    FACE: 4,
    ACCESSORY: 6,
  };

  const sorted = [...items].sort((a, b) => {
    const ao = order[a?.itemType] ?? 50;
    const bo = order[b?.itemType] ?? 50;
    return ao - bo;
  });

  // ✅ Base image selection for elevator: FACE item -> user's character -> baseChar
  const faceItem = sorted.find(
    (it) => String((it?.itemType ?? it?.type) || "").toUpperCase() === "FACE"
  );
  const baseUrl =
    (faceItem?.imageUrl ?? faceItem?.imgUrl) ||
    pick(
      user,
      "characterImageUrl",
      "characterImgUrl",
      "mergedImageUrl",
      "imageUrl",
      "imgUrl"
    ) ||
    baseChar;

  // ✅ Don't overlay FACE twice if used as base
  const layerItems = faceItem
    ? sorted.filter(
      (it) => String((it?.itemType ?? it?.type) || "").toUpperCase() !== "FACE"
    )
    : sorted;

  const VIEW = 56;
  const scale = Math.min(VIEW / BASE_W, VIEW / BASE_H);

  return (
    <div className="member-avatar">
      <div className="member-avatarViewport" aria-hidden="true">
        <div
          className="member-avatarStage"
          style={{
            width: `${BASE_W}px`,
            height: `${BASE_H}px`,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          {sorted.map((it, idx) => {
            const src = it?.imageUrl ?? it?.imgUrl; // 서버 키 차이 대비
            if (!src) return null;

            // ✅ DB 좌표/크기 적용 (Customize.jsx 로직 + CSS 기본값)
            const style = buildLayerStyleFromServer(it, it);

            return (
              <img
                key={`${user.userId ?? "u"}-${it.itemId ?? it.id ?? idx}`}
                src={src}
                alt=""
                style={{
                  ...style,
                  zIndex: idx + 1,
                }}
              />
            );
          })}
        </div>

        {/* ✅ [ADD] 배지 오버레이 */}
        {badgeSrc && (
          <div
            className="member-avatarStage"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: `${BASE_W}px`,
              height: `${BASE_H}px`,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
              pointerEvents: "none",
            }}
          >
            <img
              src={badgeSrc}
              alt=""
              style={{
                ...buildLayerStyleFromServer(badge, badge),
                zIndex: 9999,
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function ElevatorCharacterThumb({ user, badge, size = 120 }) {
  const items = Array.isArray(user?.equippedItems) ? user.equippedItems : [];
  if (!user) return null;

  // ✅ 뱃지 이미지 처리
  const equippedBadges = badge ? [badge] : [];

  // ✅ FACE 아이템을 base로 사용
  const faceItem = items.find(
    (it) => String((it?.itemType ?? it?.type) || "").toUpperCase() === "FACE"
  );
  const baseUrl =
    (faceItem?.imageUrl ?? faceItem?.imgUrl) ||
    pick(
      user,
      "characterImageUrl",
      "characterImgUrl",
      "mergedImageUrl",
      "imageUrl",
      "imgUrl"
    ) ||
    baseChar;

  // ✅ FACE를 base로 쓰면 아이템 목록에서 제외
  const layerItems = faceItem
    ? items.filter(
      (it) => String((it?.itemType ?? it?.type) || "").toUpperCase() !== "FACE"
    )
    : items;

  // ✅ Home.jsx와 동일한 방식: 고정 114x126 캔버스에 scale로 확대
  const scaleFactor = size / BASE_H; // 대략 size/126 비율

  return (
    <CharacterDisplay
      base={baseUrl}
      items={layerItems}
      badges={equippedBadges}
      style={{
        position: "relative",
        width: `${BASE_W}px`,
        height: `${BASE_H}px`,
        transform: `scale(${scaleFactor})`,
        transformOrigin: "top left",
      }}
    />
  );
}


function parseYmdToLocalDate(ymdString) {
  if (!ymdString) return null;
  const [y, m, d] = ymdString.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

async function requestJson(method, endpoint, body) {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    let msg = `HTTP ${res.status}`;
    try {
      const json = JSON.parse(text);
      if (json.message) msg = json.message;
    } catch (_) { }
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }

  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    return text;
  }
}

export default function TeamPlaceHome() {
  const navigate = useNavigate();
  const { teamId: teamIdParam } = useParams();
  const teamId = Number(teamIdParam);

  const TEAM_LEVEL_CACHE_KEY = `teamLevel:${teamId}`;

  const getInitialLevel = () => {
    if (!Number.isFinite(teamId)) return 1;
    try {
      const v = localStorage.getItem(`teamLevel:${teamId}`);
      const n = Number(v);
      return (Number.isFinite(n) && n >= 1) ? n : 1;
    } catch { return 1; }
  };

  const [isOpen, setIsOpen] = useState(true);
  const [isMoving, setIsMoving] = useState(false);

  // ✅ 배경 깜빡임 방지: 초기값으로 캐시된 레벨 사용
  const [currentFloor, setCurrentFloor] = useState(getInitialLevel);

  // ✅ 상단 숫자도 바로 보여주기
  const [teamLevel, setTeamLevel] = useState(getInitialLevel);

  // ✅ Store 사용 (캐싱 & 상태관리)
  const { fetchTeamInfo, fetchTeamFloors, fetchTeamCharacters, fetchTeamBadges, teamCache } = useTeamStore();
  const teamData = teamCache[teamId] || {};

  const teamFloors = teamData.floors || []; // teamFloors state 대체
  const info = teamData.info || {};
  const teamChars = teamData.characters || []; // teamChars state 대체 (배열)
  const badgeByUserId = teamData.badges || {}; // badgeByUserId state 대체

  // info에서 추출
  const myRole = info.myRole || null;
  const isOwner = (myRole ?? "").toLowerCase() === "owner";
  const joinCode = info.joinCode || "";
  const teamEndDate = info.endDate || null;

  // ✅ 오늘의 진행도 (useEffect 대신 useMemo로 아래 teamProgress와 동일하게 처리되므로, 
  // 여기 setTodayProgress 관련은 제거하거나 더미로 둡니다.)
  // teamProgress가 바뀔 때 setTodayProgress를 호출하는 useEffect가 아래에 있으니
  // todayProgress state는 살려두되, 초기값은 0으로 둡니다.
  const [todayProgress, setTodayProgress] = useState({
    percent: 0,
    done: 0,
    total: 0,
  });

  // ✅ teamLoading, floorsLoading 등은 Store에서 관리하면 좋지만, 
  // 일단 데이터가 없으면 로딩중으로 간주할 수 있음. 
  // 여기서는 호환성을 위해 더미 처리하거나 info가 없으면 로딩중 표시
  const teamLoading = !teamData.info;
  const floorsLoading = !teamData.floors;
  const [floorsError, setFloorsError] = useState(""); // 에러 표시용 로컬 State 부활

  // ✅ 체크박스 상태 (rowKey 기반)
  const [checkedMap, setCheckedMap] = useState({});
  const [savingMap, setSavingMap] = useState({});

  // ✅ leave
  const [leaving, setLeaving] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);

  // ✅ charByUserId (derived)
  const charByUserId = useMemo(() => {
    const map = {};
    teamChars.forEach(u => {
      if (u?.userId != null) map[u.userId] = u;
    });
    return map;
  }, [teamChars]);

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
  const applyTeamLevel = (nextLevel, { animate = true } = {}) => {
    const raw = Number(nextLevel);
    if (!Number.isFinite(raw) || raw < 1) return;

    if (lastAppliedLevelRef.current === raw) return;
    lastAppliedLevelRef.current = raw;

    setTeamLevel(raw);

    try {
      if (Number.isFinite(teamId)) {
        localStorage.setItem(`teamLevel:${teamId}`, String(raw));
      }
    } catch (_) { }

    const now = currentFloorRef.current;

    const first = !didInitFromServerRef.current;
    if (first) didInitFromServerRef.current = true;

    if (raw !== now) {
      if (first || !animate) setCurrentFloor(raw);
      else goToFloor(raw);
    }
  };

  // ✅ teamId 바뀌면 refs 초기화 + 로딩 중 숫자 숨김(null)
  // ✅ teamId 바뀌면 캐시된 레벨로 초기화 (1층 리셋 방지)
  useEffect(() => {
    didInitFromServerRef.current = false;
    lastAppliedLevelRef.current = null;

    const initLvl = getInitialLevel();
    setTeamLevel(initLvl);
    setCurrentFloor(initLvl);

    // Store 사용으로 로컬 state 초기화 불필요
  }, [teamId]);

  // ✅ Store를 이용한 데이터 로딩 (병렬 & 캐싱)
  useEffect(() => {
    if (!Number.isFinite(teamId)) return;

    // 캐시가 유효하면 네트워크 요청 안 함
    fetchTeamInfo(teamId);
    fetchTeamFloors(teamId);
    fetchTeamCharacters(teamId);
    fetchTeamBadges(teamId);
  }, [teamId, fetchTeamInfo, fetchTeamFloors, fetchTeamCharacters, fetchTeamBadges]);

  // ✅ teamLevel 변경 감지 및 애니메이션 적용
  useEffect(() => {
    const lvl = info?.level;
    if (lvl != null) {
      applyTeamLevel(Number(lvl), { animate: false });
    }
  }, [info?.level]); // info 객체가 바뀌어도 levle이 같으면 동작 안함 (primitive check)

  // teamFloors가 변경되면 checkMap 리셋 등은 아래 useEffect([taskRows])에서 처리됨


  // ✅ 렌더용 rows: "floor + assignee" 조합으로 펼치기
  const taskRows = useMemo(() => {
    const list = Array.isArray(teamFloors) ? teamFloors : [];
    const rows = [];

    for (const f of list) {
      const assignees = Array.isArray(f?.assignees) ? f.assignees : [];

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
          completed: !!f.completed,
        });
      }
    }
    return rows;
  }, [teamFloors]);

  // ✅ 팀 진행도 = floors 단위
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

    setCheckedMap((prev) => ({ ...prev, [rowKey]: nextChecked }));
    setSavingMap((prev) => ({ ...prev, [rowKey]: true }));
    setFloorsError("");

    try {
      let res;
      if (nextChecked) res = await completeTeamFloor(teamFloorId);
      else res = await cancelTeamFloor(teamFloorId);

      // ✅ 코인/팝업 정책: "D-day 지난 일정"은 클라 기준으로 무조건 차단
      if (nextChecked) {
        const isAssigned = row?.userId != null;

        // 🔥 UI에서 쓰는 기준과 똑같이: diff<0 이면 overdue
        const due = row?.dueDate;
        let clientDiff = null;
        if (typeof due === "string" && /^\d{4}-\d{2}-\d{2}$/.test(due)) {
          const d = parseYmdToLocalDate(due);
          clientDiff = d ? calcDday(d) : null;
        } else if (due) {
          const d = new Date(due);
          clientDiff = isNaN(d.getTime()) ? null : calcDday(d);
        }
        const clientOverdue = clientDiff != null && clientDiff < 0;

        // ✅ overdue면: 서버가 late:false 줘도 무시하고 팝업/코인 로직 자체를 안 탐
        if (!clientOverdue) {
          const awarded = Number(res?.coinsAwarded) || 0;
          const notAlreadyCompleted = res?.alreadyCompleted === false;

          if (isAssigned && awarded > 0 && notAlreadyCompleted) {
            setCoinPopupAmount(awarded);
            setCoinPopupOpen(true);
          }
        } else {
          // 안전: 기존에 열려있던 팝업 있으면 닫기
          setCoinPopupOpen(false);
        }
      }

      if (res?.teamLevel != null) {
        applyTeamLevel(res.teamLevel, { animate: true });
      }

      // ✅ Store 데이터 강제 갱신 (서버 최신 데이터 Load)
      fetchTeamFloors(teamId, true);
    } catch (e) {
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

        .member-col {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
        }

        .member-avatar{
          width: 56px;
          height: 56px;
          display: grid;
          place-items: center;
        }
        .member-avatarViewport{
          position: relative;
          width: 56px;
          height: 56px;
          overflow: visible;
        }
        .member-avatarStage{
          position: relative;
        }
        .member-avatarPlaceholder{
          width: 44px;
          height: 44px;
          border-radius: 999px;
          background: rgba(0,0,0,0.08);
        }

        /* ✅ [ADD] 배지 오버레이 (레이아웃 영향 X) */
        

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

        .dday-value--over {
          color: rgba(220, 38, 38, 0.95);
        }

        /* ✅ 엘리베이터 내부: 팀원 캐릭터 전원 배치 (레이아웃 영향 X: 내부 오버레이만) */
        /* ✅ 엘리베이터 내부: 사실적인 원근감 배치 (Absolute) */
        .elevator-teamChars {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 10;
          overflow: hidden; /* 영역 밖으로 나가는 것 방지 */
        }
        /* 개별 아이템은 인라인 스타일로 제어 */
        .elevator-teamCharItem {
          position: absolute;
          width: 100px; /* 터치 영역 등 고려 */
          display: flex;
          justify-content: center;
          /* transform 등은 JS에서 동적 처리 */
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
            <span className="floor-indicator-number">
              {teamLevel == null ? "" : teamLevel}
            </span>
          </div>

          <div className="floor-scene">
            <FloorBackground
              personalLevel={Math.max(1, Number(teamLevel) || 1)}
            />
          </div>

          <div
            className="elevator-inside"
            style={{ backgroundImage: `url(${elevatorInsideImg})` }}
          >
            {/* ✅ 팀원 캐릭터 전원 렌더 (원근감/겹침 처리) */}
            <div className="elevator-teamChars" aria-hidden="true">
              {(teamChars || []).map((u, i) => {
                // 최대 6명 가정: 0,1(뒤) / 2,3(중간) / 4,5(앞)
                const row = Math.floor(i / 2);
                const col = i % 2; // 0:Left, 1:Right

                // ✅ 인원수에 따라 전혀 다른 정렬
                let scale, bottom, zIndex, spread, xOffset, brightness;
                if (teamChars.length === 1) {
                  // 혼자: 가운데 안정적으로
                  scale = 1.15;
                  bottom = 35;
                  zIndex = 12;
                  spread = 0;
                  xOffset = 0;
                  brightness = '1';
                } else if (teamChars.length === 2) {
                  // 두 명: 앞쪽에 나란히
                  scale = 1.2;
                  bottom = 20;
                  zIndex = 11;
                  spread = 55;
                  xOffset = col === 0 ? -spread : spread;
                  brightness = '1';
                } else {
                  // 세 명 이상: 뒤/중간/앞 줄 배치 (원근감 수정: 더 크게, 더 앞으로)
                  scale = 1.2 + row * 0.15;
                  bottom = 80 - row * 45;
                  zIndex = 10 + row;
                  spread = 75 + row * 15;

                  // [FIX] 홀수 인원일 때 마지막 사람은 중앙 정렬 (예: 3명일 때 3번째는 앞줄 중앙)
                  if (teamChars.length % 2 !== 0 && i === teamChars.length - 1) {
                    xOffset = 0;
                  } else {
                    xOffset = col === 0 ? -spread : spread;
                  }

                  brightness = row === 0 ? "0.9" : row === 1 ? "0.97" : "1";
                }

                return (
                  <div
                    className="elevator-teamCharItem"
                    key={u?.userId}
                    style={{
                      left: `calc(50% + ${xOffset}px)`,
                      bottom: `${bottom}px`,
                      transform: `translateX(-50%) scale(${scale})`,
                      transformOrigin: 'bottom center',
                      zIndex: zIndex,
                      filter: `brightness(${brightness})`,
                    }}
                  >
                    <ElevatorCharacterThumb
                      user={u}
                      badge={u?.userId ? badgeByUserId?.[u.userId] : null}
                      size={130} /* ✅ 사이즈 키움 (110 -> 130) */
                    />
                  </div>
                );
              })}
            </div>
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
        <button
          className="teamplace-btn"
          onClick={() => navigate(`/teamboard/${teamId}`)}
        >
          팀 게시판
        </button>
      </div>

      {/* ✅ 프로젝트 마감 D-day */}
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
              const userBadge = r.userId ? badgeByUserId?.[r.userId] : null; // ✅ [ADD]

              return (
                <div className="everyone-row" key={r.rowKey}>
                  <div className="member-col">
                    <CharacterThumb user={userChar} badge={userBadge} />
                    <div className="member-name">{r.username}</div>
                  </div>

                  <div
                    className={`task-box ${isOverdue ? "task-box--overdue" : ""
                      }`}
                    role="group"
                    aria-label="팀 할 일"
                  >
                    <div className="task-left">
                      <div
                        className={`task-meta ${isOverdue ? "task-meta--overdue" : ""
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
