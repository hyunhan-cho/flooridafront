import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import TeamHeader from "../components/TeamHeader.jsx";
import "./TeamCreate.css";

import { createTeam, getTeamCharacters } from "../services/team.js";
import {
  getStoreItems,
  getMyEquippedItems,
  getMyItems, // ✅ [추가] store 403 대비용
} from "../services/store.js";
import { getMyCharacter } from "../services/character.js";
import {
  getMyEquippedBadges,
  getTeamMembersBadges,
} from "../services/badge.js";

// ✅ 팀원 캐릭터 프리뷰 컴포넌트(팀 API 기반 프리뷰 재사용)
import { TeamCharactersPreview } from "../components/CharacterPreview.jsx";

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

// ✅ 기준 좌표계(팀 프리뷰와 동일하게)
const BASE_W = 114;
const BASE_H = 126;

// ✅ 상대경로 보정
function normalizeUrlStr(v) {
  if (typeof v !== "string") return "";
  const u = v.trim();
  if (!u) return "";
  if (u.startsWith("http") || u.startsWith("/")) return u;
  return `/${u}`;
}

// ✅ imgUrl 키 다양화 + nested(item/badge) 대응 + 상대경로 보정
function pickImgUrl(obj, depth = 0) {
  if (!obj || depth > 2) return "";

  const v =
    obj?.imgUrl ?? // items swagger
    obj?.imageUrl ?? // badges swagger
    obj?.itemImgUrl ??
    obj?.itemImageUrl ??
    obj?.badgeImgUrl ??
    obj?.badgeImageUrl ??
    obj?.thumbnailUrl ??
    obj?.img_url ??
    obj?.image_url ??
    obj?.imagePath ??
    obj?.url ??
    obj?.image ??
    null;

  if (typeof v === "string" && v.trim()) return normalizeUrlStr(v);

  const nested =
    obj?.item ?? obj?.itemDto ?? obj?.itemInfo ?? obj?.badge ?? obj?.badgeDto;
  if (nested) return pickImgUrl(nested, depth + 1);

  return "";
}

// ✅ meta nested 구조까지 제대로 반영해서 width/height/offset이 "원본 이미지 크기"로 튀는 것 방지
function buildLayerStyle(raw, meta) {
  const m = meta?.item ?? meta?.itemDto ?? meta?.itemInfo ?? meta ?? null;

  const x = toNum(
    pick(raw, "offsetX", "offset_x", "x", "left", "posX", "positionX") ??
      pick(m, "offsetX", "offset_x", "x", "left", "posX", "positionX")
  );
  const y = toNum(
    pick(raw, "offsetY", "offset_y", "y", "top", "posY", "positionY") ??
      pick(m, "offsetY", "offset_y", "y", "top", "posY", "positionY")
  );

  const w = toNum(
    pick(raw, "width", "w", "itemWidth") ?? pick(m, "width", "w", "itemWidth")
  );
  const h = toNum(
    pick(raw, "height", "h", "itemHeight") ??
      pick(m, "height", "h", "itemHeight")
  );

  const s = toNum(
    pick(raw, "scale", "size", "ratio") ?? pick(m, "scale", "size", "ratio")
  );
  const scale = s == null ? null : s > 10 ? s / 100 : s;

  const style = {};
  if (x != null) style.left = `${x}px`;
  if (y != null) style.top = `${y}px`;
  if (w != null && w > 3) style.width = `${w}px`;
  if (h != null && h > 3) style.height = `${h}px`;

  // width/height 없고 scale만 있을 때 대응
  if ((w == null || h == null) && scale != null && scale !== 1) {
    style.transform = `scale(${scale})`;
    style.transformOrigin = "top left";
  }

  return style;
}

// ✅ equippedItems / equippedBadges 같은 키도 대응
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

// ✅ TeamCreate 결과 화면용 로컬 캔버스(114x126 좌표계에서 합성) → CSS 늘림 때문에 깨지는 것 방지
function LocalCharacterCanvas({
  baseUrl,
  layers = [],
  scale = 1,
  title = "my",
}) {
  const wrapStyle = {
    width: `${BASE_W * scale}px`,
    height: `${BASE_H * scale}px`,
    position: "relative",
    overflow: "hidden",
  };

  const stageStyle = {
    width: `${BASE_W}px`,
    height: `${BASE_H}px`,
    position: "absolute",
    left: 0,
    top: 0,
    transform: `scale(${scale})`,
    transformOrigin: "top left",
  };

  const baseStyle = {
    position: "absolute",
    left: 0,
    top: 0,
    width: `${BASE_W}px`,
    height: `${BASE_H}px`,
    objectFit: "contain",
    imageRendering: "pixelated",
    userSelect: "none",
    pointerEvents: "none",
  };

  return (
    <div style={wrapStyle} title={title}>
      <div style={stageStyle}>
        {baseUrl ? (
          <img
            src={baseUrl}
            alt="base"
            style={baseStyle}
            onError={(e) => (e.currentTarget.style.display = "none")}
            draggable={false}
          />
        ) : (
          <div style={{ position: "absolute", inset: 0 }} />
        )}

        {layers.map((l) => (
          <img
            key={l.key}
            src={l.url}
            alt={l.kind ?? "layer"}
            style={{
              position: "absolute",
              objectFit: "contain",
              imageRendering: "pixelated",
              userSelect: "none",
              pointerEvents: "none",
              ...l.style,
            }}
            onError={(e) => (e.currentTarget.style.display = "none")}
            draggable={false}
          />
        ))}
      </div>
    </div>
  );
}

function MyCharacterPreview({ accessoryMetaById, teamId }) {
  const [baseUrl, setBaseUrl] = useState("");
  const [itemLayers, setItemLayers] = useState([]);
  const [badgeLayers, setBadgeLayers] = useState([]);

  useEffect(() => {
    // ✅ 팀이 이미 만들어졌으면(result 단계) "팀원 1명 프리뷰"로 보여주기만 하면 됨.
    // (여기서는 /me/* 호출을 일부러 안 함)
    if (teamId) return;

    let ignore = false;

    const run = async () => {
      try {
        // 1) 내 캐릭터(합성/기본) base 후보
        const c = await getMyCharacter();
        const baseFromCharacter =
          normalizeUrlStr(
            pick(c, "imageUrl", "characterImageUrl") ||
              pick(c?.data, "imageUrl", "characterImageUrl") ||
              pick(c?.result, "imageUrl", "characterImageUrl") ||
              ""
          ) || "";

        // 2) 장착 아이템(FACE를 base로 우선)
        const eq = await getMyEquippedItems().catch(() => null);
        const eqList = normalizeList(eq);

        const faceItem = eqList.find((it) => {
          const inner = it?.item ?? it?.itemDto ?? it?.itemInfo ?? null;
          const t = String(
            it.type ?? it.itemType ?? inner?.type ?? inner?.itemType ?? ""
          ).toUpperCase();
          return t === "FACE";
        });

        const faceBaseUrl =
          pickImgUrl(faceItem) ||
          pickImgUrl(faceItem?.item) ||
          pickImgUrl(faceItem?.itemDto) ||
          pickImgUrl(faceItem?.itemInfo) ||
          "";

        const finalBase = faceBaseUrl || baseFromCharacter;
        if (!ignore) setBaseUrl(finalBase);

        // ✅ ACCESSORY 레이어(= FACE 제외)
        const layers = eqList
          .map((it, idx) => {
            const inner = it?.item ?? it?.itemDto ?? it?.itemInfo ?? null;

            const id = Number(
              it.itemId ?? it.id ?? inner?.itemId ?? inner?.id ?? null
            );
            if (Number.isNaN(id)) return null;

            const type = String(
              it.type ?? it.itemType ?? inner?.type ?? inner?.itemType ?? ""
            ).toUpperCase();
            if (type === "FACE") return null;

            const meta = accessoryMetaById?.[id] ?? inner ?? null;

            const url = pickImgUrl(it) || pickImgUrl(inner) || pickImgUrl(meta);
            if (!url) return null;

            return {
              key: `it-${id}-${idx}`,
              url,
              style: buildLayerStyle(it, meta),
            };
          })
          .filter(Boolean);

        if (!ignore) setItemLayers(layers);

        // ✅ 장착 뱃지
        const b = await getMyEquippedBadges().catch(() => null);
        const bList = normalizeList(b);

        const blayers = bList
          .map((badge, idx) => {
            const inner = badge?.badge ?? badge?.badgeDto ?? null;

            const id = Number(
              badge.badgeId ?? badge.badge_id ?? badge.id ?? inner?.id ?? null
            );
            if (Number.isNaN(id)) return null;

            const url = pickImgUrl(badge) || pickImgUrl(inner);
            if (!url) return null;

            return {
              key: `bd-${id}-${idx}`,
              url,
              style: buildLayerStyle(badge, inner ?? badge),
            };
          })
          .filter(Boolean);

        if (!ignore) setBadgeLayers(blayers);
      } catch {
        // ignore
      }
    };

    run();
    return () => {
      ignore = true;
    };
  }, [accessoryMetaById, teamId]);

  // ✅ result 단계(팀 생성 후): 팀원 API 기반 프리뷰(=팀원 1명)로 렌더
  if (teamId) {
    return (
      <div className="tc-charStage">
        <TeamCharactersPreview
          teamId={teamId}
          fetcher={getTeamCharacters}
          badgesFetcher={getTeamMembersBadges}
          max={1}
          scale={0.7}
          showNames={false}
        />
      </div>
    );
  }

  // ✅ form 단계(팀 생성 전): 기존 /me 기반 로컬 합성 프리뷰 유지
  return (
    <div className="tc-charStage">
      <LocalCharacterCanvas
        baseUrl={baseUrl}
        layers={[
          ...itemLayers.map((l) => ({ ...l, kind: "item" })),
          ...badgeLayers.map((l) => ({ ...l, kind: "badge" })),
        ]}
        scale={1}
        title="my-character"
      />
    </div>
  );
}

export default function TeamCreate() {
  const navigate = useNavigate();

  // step: "form" | "result"
  const [step, setStep] = useState("form");

  const [teamName, setTeamName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState(null);

  // ACCESSORY 카탈로그 메타(아이템 imgUrl/좌표 보정용)
  const [accessoryMetaById, setAccessoryMetaById] = useState({});

  useEffect(() => {
    let ignore = false;
    const run = async () => {
      try {
        // ✅ store catalog(ACCESSORY) 403 나도, 내 보유 아이템(myItems)에서 meta 만들기
        const [storeRes, myRes] = await Promise.allSettled([
          getStoreItems("ACCESSORY"),
          getMyItems(),
        ]);

        const storeList =
          storeRes.status === "fulfilled" ? normalizeList(storeRes.value) : [];
        const myList =
          myRes.status === "fulfilled" ? normalizeList(myRes.value) : [];

        const merged = [...storeList, ...myList];

        const map = {};
        merged.forEach((it) => {
          // ✅ nested(item) 구조까지 id 잡히게 보강
          const inner = it?.item ?? it?.itemDto ?? it?.itemInfo ?? it;
          const id = Number(inner?.itemId ?? inner?.id ?? it?.itemId ?? it?.id);
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

  const canSubmit = useMemo(() => {
    const name = teamName.trim();
    if (!name) return false;
    if (!startDate || !endDate) return false;
    if (startDate > endDate) return false;
    return true;
  }, [teamName, startDate, endDate]);

  const onCreate = async () => {
    if (!canSubmit) {
      if (!teamName.trim()) return alert("팀 프로젝트 이름을 입력해줘!");
      if (!startDate) return alert("시작일을 선택해줘!");
      if (!endDate) return alert("종료일을 선택해줘!");
      if (startDate > endDate) return alert("종료일은 시작일 이후여야 해!");
      return;
    }

    setCreating(true);
    try {
      const res = await createTeam({
        name: teamName.trim(),
        startDate,
        endDate,
      });

      const teamId =
        pick(res, "teamId", "id") ??
        pick(res?.data, "teamId", "id") ??
        pick(res?.result, "teamId", "id");

      const joinCode =
        pick(res, "joinCode") ??
        pick(res?.data, "joinCode") ??
        pick(res?.result, "joinCode");

      if (!teamId || !joinCode) {
        alert(
          "팀 생성 응답에 teamId/joinCode가 없어요. 백엔드 응답 키 확인 필요!"
        );
        return;
      }

      setResult({
        teamId: Number(teamId),
        joinCode: String(joinCode),
        name: teamName.trim(),
        startDate,
        endDate,
      });

      setStep("result");
    } catch (e) {
      if (e?.status === 401) alert("로그인이 만료됐어요. 다시 로그인해줘!");
      else if (e?.status === 403)
        alert("권한이 없어요(403). 토큰/권한 확인 필요!");
      else alert("팀 생성 실패!");
    } finally {
      setCreating(false);
    }
  };

  const onCopy = async () => {
    if (!result?.joinCode) return;
    try {
      await navigator.clipboard.writeText(result.joinCode);
      alert("초대코드를 복사했어요!");
    } catch {
      alert("복사 실패! 직접 선택해서 복사해줘.");
    }
  };

  return (
    <div className="tc-page">
      <TeamHeader />

      <main className="tc-main">
        <section className="tc-card">
          <button
            className="tc-backBtn"
            onClick={() => navigate(-1)}
            aria-label="back"
          >
            ‹
          </button>

          {step === "form" ? (
            <>
              <div className="tc-title">팀을 직접 만들어보세요</div>
              <div className="tc-desc">
                기본 정보를 입력하세요.
                <br />그 후에 입장 코드가 생성됩니다.
              </div>

              <label className="tc-label">팀 프로젝트 이름</label>
              <textarea
                className="tc-textarea"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="달성하고 싶은 계획을 설정해주세요!"
              />

              <label className="tc-label">언제부터인가요?</label>
              <input
                className="tc-input"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />

              <label className="tc-label">언제까지인가요?</label>
              <input
                className="tc-input"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />

              <button
                className="tc-primaryBtn"
                onClick={onCreate}
                disabled={creating}
              >
                {creating ? "생성 중..." : "팀 만들기"}
              </button>
            </>
          ) : (
            <>
              <div className="tc-title">팀 입장 코드가 생성되었습니다.</div>
              <div className="tc-desc">내용을 확인해주세요.</div>

              <div className="tc-summary">
                <div className="tc-summaryTop">
                  <div className="tc-summaryName">{result?.name}</div>
                  <div className="tc-summaryPeriod">
                    {result?.startDate} ~ {result?.endDate}
                  </div>
                </div>

                <div className="tc-summaryBody">
                  <MyCharacterPreview
                    accessoryMetaById={accessoryMetaById}
                    teamId={result?.teamId}
                  />
                </div>
              </div>

              <div className="tc-joinBox">
                <div className="tc-joinLabel">입장 코드</div>
                <div className="tc-joinRow">
                  <input
                    className="tc-joinInput"
                    value={result?.joinCode ?? ""}
                    readOnly
                  />
                  <button className="tc-copyBtn" onClick={onCopy}>
                    복사하기
                  </button>
                </div>
              </div>

              <button
                className="tc-primaryBtn"
                onClick={() => navigate(`/teamplacehome/${result.teamId}`)}
              >
                완료하기
              </button>
            </>
          )}
        </section>
      </main>

      <Navbar />
    </div>
  );
}
