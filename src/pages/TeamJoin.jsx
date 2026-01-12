import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import TeamHeader from "../components/TeamHeader.jsx";
import "./TeamJoin.css";

import {
  getTeams,
  joinTeam,
  getTeam,
  getTeamCharacters,
} from "../services/team.js";
import { leaveTeam } from "../services/api.js";
import { getStoreItems } from "../services/store.js";

const BASE_W = 114;
const BASE_H = 126;

function normalizeList(raw) {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.data)) return raw.data;
  if (Array.isArray(raw?.result)) return raw.result;
  if (Array.isArray(raw?.items)) return raw.items;
  if (Array.isArray(raw?.badges)) return raw.badges;
  if (Array.isArray(raw?.equippedItems)) return raw.equippedItems;
  if (Array.isArray(raw?.equippedBadges)) return raw.equippedBadges;
  return [];
}

function pick(obj, ...keys) {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return null;
}

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

// 상대경로 보정: "cat.png" 같은 게 오면 "/cat.png"로
function normalizeUrlStr(v) {
  if (typeof v !== "string") return "";
  const u = v.trim();
  if (!u) return "";
  if (u.startsWith("http") || u.startsWith("/")) return u;
  return `/${u}`;
}

// imageUrl 키 다양화 + nested(item/badge) 대응
function pickImgUrl(obj, depth = 0) {
  if (!obj || depth > 2) return "";

  const v =
    obj?.imgUrl ??
    obj?.imageUrl ??
    obj?.img_url ??
    obj?.image_url ??
    obj?.url ??
    obj?.image ??
    null;

  if (typeof v === "string" && v.trim()) return normalizeUrlStr(v);

  const nested =
    obj?.item ?? obj?.itemDto ?? obj?.itemInfo ?? obj?.badge ?? obj?.badgeDto;
  if (nested) return pickImgUrl(nested, depth + 1);

  return "";
}

// ✅ (핵심) raw에서 못 찾으면 meta에서 찾는 방식으로 분리 (값을 pick에 넣지 않음!)
function buildLayerStyle(raw, meta) {
  const x =
    toNum(pick(raw, "offsetX", "offset_x", "x", "left", "posX", "positionX")) ??
    toNum(pick(meta, "offsetX", "offset_x", "x", "left", "posX", "positionX"));

  const y =
    toNum(pick(raw, "offsetY", "offset_y", "y", "top", "posY", "positionY")) ??
    toNum(pick(meta, "offsetY", "offset_y", "y", "top", "posY", "positionY"));

  const w =
    toNum(pick(raw, "width", "w", "itemWidth")) ??
    toNum(pick(meta, "width", "w", "itemWidth"));

  const h =
    toNum(pick(raw, "height", "h", "itemHeight")) ??
    toNum(pick(meta, "height", "h", "itemHeight"));

  const style = {};
  if (x != null) style.left = `${x}px`;
  if (y != null) style.top = `${y}px`;
  if (w != null && w > 3) style.width = `${w}px`;
  if (h != null && h > 3) style.height = `${h}px`;
  return style;
}

/**
 * ✅ 114x126 좌표계는 그대로 두고, 바깥에서 scale로만 줄이는 캔버스
 * - offset/width/height가 깨지지 않음
 */
function CharacterCanvas({ baseUrl, layers = [], scale = 0.58 }) {
  const wrapStyle = useMemo(
    () => ({
      width: `${BASE_W * scale}px`,
      height: `${BASE_H * scale}px`,
      position: "relative",
      overflow: "hidden",
    }),
    [scale]
  );

  const stageStyle = useMemo(
    () => ({
      width: `${BASE_W}px`,
      height: `${BASE_H}px`,
      position: "absolute",
      left: 0,
      top: 0,
      transform: `scale(${scale})`,
      transformOrigin: "top left",
    }),
    [scale]
  );

  return (
    <div className="tj-charStage" style={wrapStyle}>
      <div style={stageStyle}>
        {baseUrl ? (
          <img
            className="tj-layer"
            src={baseUrl}
            alt="base"
            draggable={false}
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: `${BASE_W}px`,
              height: `${BASE_H}px`,
              objectFit: "contain",
              display: "block",
            }}
            onError={(e) => (e.currentTarget.style.display = "none")}
          />
        ) : (
          <div className="tj-charFallback" />
        )}

        {layers.map((l) => (
          <img
            key={l.key}
            className="tj-layer"
            src={l.url}
            alt="layer"
            draggable={false}
            style={{
              position: "absolute",
              objectFit: "contain",
              display: "block",
              ...l.style,
            }}
            onError={(e) => (e.currentTarget.style.display = "none")}
          />
        ))}
      </div>
    </div>
  );
}

function MemberPreview({ member, accessoryMetaById, scale = 0.58 }) {
  // 1) 서버가 합성 이미지를 주면 그게 최우선
  const merged =
    pick(
      member,
      "characterImageUrl",
      "characterImgUrl",
      "imageUrl",
      "characterUrl",
      "mergedImageUrl"
    ) ||
    pick(member?.data, "imageUrl") ||
    "";

  const mergedUrl = normalizeUrlStr(merged);

  // 2) 없으면 equippedItems/badges를 레이어로
  const equippedItems = normalizeList(
    pick(member, "equippedItems", "items", "equipped_items")
  );
  const equippedBadges = normalizeList(
    pick(member, "equippedBadges", "badges", "equipped_badges")
  );

  // ✅ FACE를 base로 깔아주면 merged가 없을 때도 최소한 “몸”이 보임
  const faceItem = equippedItems.find((it) => {
    const inner = it?.item ?? it?.itemDto ?? it?.itemInfo ?? null;
    const t = String(
      pick(it, "itemType", "type") ?? pick(inner, "itemType", "type") ?? ""
    ).toUpperCase();
    return t === "FACE";
  });

  const faceUrl = pickImgUrl(faceItem);

  // base 우선순위: merged(합성) -> face
  const baseUrl = mergedUrl || faceUrl;

  // ✅ merged(합성) 있으면 레이어를 굳이 또 올리지 않음 (중복/깨짐 방지)
  const layers = useMemo(() => {
    if (mergedUrl) return [];

    const uid = member?.userId ?? member?.id ?? "m";

    const itemLayers = equippedItems
      .filter((it) => {
        const inner = it?.item ?? it?.itemDto ?? it?.itemInfo ?? null;
        const t = String(
          pick(it, "itemType", "type") ?? pick(inner, "itemType", "type") ?? ""
        ).toUpperCase();
        return t !== "FACE";
      })
      .map((it, idx) => {
        const inner = it?.item ?? it?.itemDto ?? it?.itemInfo ?? null;
        const id = Number(it.itemId ?? it.id ?? inner?.itemId ?? inner?.id);
        const meta = !Number.isNaN(id)
          ? accessoryMetaById?.[id] ?? inner ?? null
          : inner ?? null;

        const url = pickImgUrl(it) || pickImgUrl(inner) || pickImgUrl(meta);
        if (!url) return null;

        return {
          key: `it-${uid}-${idx}`,
          url,
          style: buildLayerStyle(it, meta),
        };
      })
      .filter(Boolean);

    const badgeLayers = equippedBadges
      .map((b, idx) => {
        const inner = b?.badge ?? b?.badgeDto ?? null;
        const url = pickImgUrl(b) || pickImgUrl(inner);
        if (!url) return null;

        return {
          key: `bd-${uid}-${idx}`,
          url,
          style: buildLayerStyle(b, inner ?? b),
        };
      })
      .filter(Boolean);

    return [...itemLayers, ...badgeLayers]; // 뱃지가 위
  }, [mergedUrl, equippedItems, equippedBadges, accessoryMetaById, member]);

  return <CharacterCanvas baseUrl={baseUrl} layers={layers} scale={scale} />;
}

export default function TeamJoin() {
  const navigate = useNavigate();

  // step: "code" | "confirm"
  const [step, setStep] = useState("code");
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);

  const [pendingTeamId, setPendingTeamId] = useState(null);
  const [teamInfo, setTeamInfo] = useState(null);
  const [members, setMembers] = useState([]);
  const [loadErr, setLoadErr] = useState(null);

  // accessory meta
  const [accessoryMetaById, setAccessoryMetaById] = useState({});

  useEffect(() => {
    let ignore = false;
    const run = async () => {
      try {
        const raw = await getStoreItems("ACCESSORY");
        const list = normalizeList(raw);
        const map = {};
        list.forEach((it) => {
          const id = Number(it.itemId ?? it.id);
          if (!Number.isNaN(id)) map[id] = it;
        });
        if (!ignore) setAccessoryMetaById(map);
      } catch {
        if (!ignore) setAccessoryMetaById({});
      }
    };
    run();
    return () => {
      ignore = true;
    };
  }, []);

  const findNewTeamIdByDiff = (beforeList, afterList) => {
    const beforeIds = new Set(beforeList.map((t) => Number(t.teamId ?? t.id)));
    const added = afterList.find(
      (t) => !beforeIds.has(Number(t.teamId ?? t.id))
    );
    return added ? Number(added.teamId ?? added.id) : null;
  };

  const submitJoin = useCallback(async () => {
    const code = joinCode.trim();
    if (!code) return alert("입장 코드를 입력해줘!");

    setJoining(true);
    setLoadErr(null);

    try {
      const beforeRaw = await getTeams().catch(() => []);
      const before = normalizeList(beforeRaw);

      const joinRes = await joinTeam(code);

      const directTeamId = toNum(
        pick(joinRes, "teamId", "id") ??
          pick(joinRes?.data, "teamId", "id") ??
          pick(joinRes?.result, "teamId", "id")
      );

      const afterRaw = await getTeams().catch(() => []);
      const after = normalizeList(afterRaw);

      const teamId =
        (directTeamId != null ? Number(directTeamId) : null) ||
        findNewTeamIdByDiff(before, after) ||
        (after.length === 1 ? Number(after[0].teamId ?? after[0].id) : null);

      if (!teamId) {
        alert("팀 가입은 됐는데 teamId를 확정할 수 없어요. 응답 확인 필요!");
        return;
      }

      setPendingTeamId(teamId);

      // ✅ 가입 후: 팀/팀원 정보 로드
      const [infoRaw, charsRaw] = await Promise.all([
        getTeam(teamId),
        getTeamCharacters(teamId),
      ]);
      const info = infoRaw?.data ?? infoRaw?.result ?? infoRaw;
      const chars = normalizeList(charsRaw);

      setTeamInfo(info);
      setMembers(chars);
      setStep("confirm");
    } catch {
      alert("팀 참가 실패(코드 오류/이미 가입 등)!");
    } finally {
      setJoining(false);
    }
  }, [joinCode]);

  const cancelJoin = useCallback(async () => {
    const tid = pendingTeamId;
    setStep("code");
    setJoinCode("");
    setTeamInfo(null);
    setMembers([]);
    setLoadErr(null);

    if (tid != null) {
      try {
        await leaveTeam(tid);
      } catch {
        // ignore
      }
    }
    setPendingTeamId(null);
  }, [pendingTeamId]);

  const confirmEnter = useCallback(() => {
    if (!pendingTeamId) return;
    navigate(`/teamplacehome/${pendingTeamId}`);
  }, [pendingTeamId, navigate]);

  return (
    <div className="tj-page">
      <TeamHeader />

      <main className="tj-main">
        <section className="tj-card">
          <button
            className="tj-backBtn"
            onClick={() => navigate(-1)}
            aria-label="back"
          >
            ‹
          </button>

          {step === "code" ? (
            <>
              <div className="tj-title">팀 입장하기</div>
              <div className="tj-desc">초대 코드를 입력해 팀에 참여해요.</div>

              <label className="tj-label">입장 코드</label>
              <input
                className="tj-input"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="예) 23572633"
              />

              <button
                className="tj-primaryBtn"
                onClick={submitJoin}
                disabled={joining}
              >
                {joining ? "처리 중..." : "입장하기"}
              </button>
            </>
          ) : (
            <>
              <div className="tj-title">이 팀이 맞나요?</div>
              <div className="tj-desc">
                맞으면 입장하고, 아니면 자동으로 되돌려요.
              </div>

              {loadErr ? <div className="tj-error">{loadErr}</div> : null}

              {/* ✅✅✅ JoinedTeamPlace 카드랑 동일한 구조로 */}
              <div className="tj-teamcard" role="presentation">
                {/* 짙은 회색(상단): 팀명 */}
                <div className="tj-teamcard-top">
                  <div className="tj-teamname">
                    {teamInfo?.name ?? "팀 이름"}
                  </div>
                </div>

                {/* 연한 회색(중단): 날짜 + 캐릭터 미리보기(가로 스크롤) */}
                <div className="tj-teamcard-mid">
                  <div className="tj-period">
                    {teamInfo?.startDate ?? ""} ~ {teamInfo?.endDate ?? ""}
                  </div>

                  <div className="tj-mid-row">
                    <div className="tj-preview-wrap">
                      {members.length === 0 ? (
                        <div className="tj-muted">
                          팀원 정보를 불러오지 못했어요.
                        </div>
                      ) : (
                        members.map((m) => (
                          <div
                            className="tj-preview-item"
                            key={
                              m.userId ??
                              m.id ??
                              m.username ??
                              `${Math.random()}`
                            }
                          >
                            <MemberPreview
                              member={m}
                              accessoryMetaById={accessoryMetaById}
                              scale={0.5} // ✅ JoinedTeamPlace랑 비슷한 크기
                            />
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="tj-actions">
                <button className="tj-ghostBtn" onClick={cancelJoin}>
                  아니요
                </button>
                <button className="tj-primaryBtn" onClick={confirmEnter}>
                  네, 입장할래요
                </button>
              </div>

              <div className="tj-note">
                * “아니요”를 누르면 방금 참여한 기록을 자동으로 되돌려요(팀
                나가기 처리).
              </div>
            </>
          )}
        </section>
      </main>

      <Navbar />
    </div>
  );
}
