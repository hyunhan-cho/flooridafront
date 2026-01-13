import React, { useEffect, useMemo, useState } from "react";
import "./CharacterPreview.css";
import baseChar from "../assets/ch/cha_1.png";

/**
 * 기준 캔버스(좌표계) 크기
 * - DB에서 offset/width/height 맞춘 기준이 114x126이면 그대로
 * - 기준이 다르면 여기만 바꾸면 됨
 */
const BASE_W = 114;
const BASE_H = 126;

function normalizeList(raw) {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.data)) return raw.data;
  if (Array.isArray(raw?.result)) return raw.result;
  if (Array.isArray(raw?.items)) return raw.items;
  return [];
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

function toBool(v) {
  if (v === undefined || v === null) return null;
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") {
    const t = v.trim().toLowerCase();
    if (t === "true" || t === "1" || t === "y" || t === "yes") return true;
    if (t === "false" || t === "0" || t === "n" || t === "no") return false;
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

function getUserId(obj) {
  const v = pick(obj, "userId", "user_id", "id", "memberId", "member_id");
  const n = toNum(v);
  return n != null ? Number(n) : null;
}

function pickImgUrl(obj) {
  const v =
    obj?.imageUrl ??
    obj?.imgUrl ??
    obj?.image_url ??
    obj?.img_url ??
    obj?.url ??
    obj?.image ??
    null;

  if (typeof v !== "string") return "";
  const u = v.trim();
  if (!u) return "";
  if (u.startsWith("http") || u.startsWith("/")) return u;
  return `/${u}`; // 상대경로면 same-origin 기준으로 붙임
}

function buildLayerStyle(raw) {
  const x = toNum(pick(raw, "offsetX", "offset_x", "x", "left", "posX"));
  const y = toNum(pick(raw, "offsetY", "offset_y", "y", "top", "posY"));
  const w = toNum(pick(raw, "width", "w", "itemWidth"));
  const h = toNum(pick(raw, "height", "h", "itemHeight"));
  const sRaw = pick(raw, "scale", "size");

  const sNum = toNum(sRaw);
  // 10보다 크면 백분율로 간주 (e.g. 85 -> 0.85)
  const scale = sNum == null ? null : sNum > 10 ? sNum / 100 : sNum;

  const style = {};
  if (x != null) style.left = `${x}px`;
  if (y != null) style.top = `${y}px`;

  // width/height가 3 이하(비율?)가 아니면 px로 적용
  const looksLikeRatio = (n) => n != null && n > 0 && n <= 3;
  if (w != null && !looksLikeRatio(w)) style.width = `${w}px`;
  if (h != null && !looksLikeRatio(h)) style.height = `${h}px`;

  // w/h가 없거나 비율이거나, scale이 있으면 transform 적용
  if (
    (w == null || h == null || looksLikeRatio(w) || looksLikeRatio(h)) &&
    scale != null &&
    scale !== 1
  ) {
    style.transform = `scale(${scale})`;
    style.transformOrigin = "top left";
  }

  return style;
}

/**
 * ✅ 순수 렌더러: base + layers를 "같은 좌표계"에서 합성해서 보여줌
 * - scale을 바꿔도 좌표는 깨지지 않음(스테이지 내부를 transform으로 확대)
 */
export function CharacterCanvas({
  baseUrl,
  layers = [],
  scale = 1,
  className = "",
  title = "character",
}) {
  const wrapStyle = useMemo(
    () => ({
      width: `${BASE_W * scale}px`,
      height: `${BASE_H * scale}px`,
    }),
    [scale]
  );

  const stageStyle = useMemo(
    () => ({
      transform: `scale(${scale})`,
      transformOrigin: "top left",
      width: `${BASE_W}px`,
      height: `${BASE_H}px`,
    }),
    [scale]
  );

  return (
    <div className={`cp-wrap ${className}`} style={wrapStyle} title={title}>
      <div className="cp-stage" style={stageStyle}>
        {baseUrl ? (
          <img
            className="cp-layer cp-base"
            src={baseUrl}
            alt="base"
            onError={(e) => (e.currentTarget.style.display = "none")}
            draggable={false}
          />
        ) : (
          <div className="cp-fallback" />
        )}

        {layers.map((l) => (
          <img
            key={l.key}
            className={`cp-layer ${l.kind === "badge" ? "cp-badge" : "cp-item"
              }`}
            src={l.url}
            alt={l.kind ?? "layer"}
            style={l.style}
            onError={(e) => (e.currentTarget.style.display = "none")}
            draggable={false}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * ✅ 멤버 1명(팀원) 프리뷰
 * - equippedItems 안에 FACE/ACCESSORY가 섞여있으면:
 *   - FACE를 base로 깔고
 *   - 나머지를 layers로 올림
 * - equippedBadges는 뱃지 전용 레이어로 마지막에 올림(항상 위)
 */
export function MemberCharacterPreview({
  member,
  scale = 0.42,
  showName = false,
  className = "",
}) {
  const equippedItems = normalizeList(
    pick(member, "equippedItems", "items", "equipped_items")
  );
  const equippedBadges = normalizeList(
    pick(member, "equippedBadges", "badges", "equipped_badges")
  );

  const faceItem = equippedItems.find((it) => {
    const t = String(pick(it, "itemType", "type")).toUpperCase();
    return t === "FACE";
  });

  // ✅ base 우선순위: FACE item imageUrl -> member.characterImageUrl(있으면 fallback)
  const baseUrl =
    pickImgUrl(faceItem) ||
    pickImgUrl(
      pick(
        member,
        "characterImageUrl",
        "characterImgUrl",
        "mergedImageUrl",
        "imageUrl"
      )
    ) || baseChar;

  const layers = useMemo(() => {
    const uid = getUserId(member) ?? "m";

    const accLayers = equippedItems
      .filter(
        (it) => String(pick(it, "itemType", "type")).toUpperCase() !== "FACE"
      )
      .map((it, idx) => {
        const url = pickImgUrl(it);
        if (!url) return null;
        const style = buildLayerStyle(it);
        return {
          key: `it-${uid}-${idx}`,
          kind: "item",
          url,
          style,
        };
      })
      .filter(Boolean);

    // ✅ 새 팀 뱃지 API는 equippedBadges에 equipped=true가 있을 수 있음 → false면 제외
    const badgeLayers = equippedBadges
      .filter((b) => {
        const equipped = toBool(pick(b, "equipped", "isEquipped"));
        return equipped === null ? true : equipped === true;
      })
      .map((b, idx) => {
        const url = pickImgUrl(b);
        if (!url) return null;
        const style = buildLayerStyle(b);
        return {
          key: `bd-${uid}-${idx}`,
          kind: "badge",
          url,
          style,
        };
      })
      .filter(Boolean);

    // ✅ 아이템 → 뱃지 순서(뱃지가 항상 위로)
    return [...accLayers, ...badgeLayers];
  }, [equippedItems, equippedBadges, member]);

  return (
    <div className={`cp-member ${className}`}>
      <CharacterCanvas baseUrl={baseUrl} layers={layers} scale={scale} />
      {showName ? (
        <div className="cp-name">
          {member?.username ??
            member?.name ??
            `USER ${getUserId(member) ?? ""}`}
        </div>
      ) : null}
    </div>
  );
}

function mergeMembersByUserId(charMembersRaw, badgeMembersRaw) {
  const charMembers = normalizeList(charMembersRaw).map((m) => ({ ...m }));
  const badgeMembers = normalizeList(badgeMembersRaw);

  // badgesMap: userId -> badgeMember
  const badgesMap = new Map();
  for (const bm of badgeMembers) {
    const uid = getUserId(bm);
    if (uid == null) continue;
    badgesMap.set(uid, bm);
  }

  // 1) 캐릭터 목록 기준으로 badges 합치기 (순서 유지)
  const merged = charMembers.map((cm) => {
    const uid = getUserId(cm);
    if (uid == null) return cm;

    const bm = badgesMap.get(uid);
    if (!bm) return cm;

    // bm 쪽 username 같은 게 더 “최신”이면 덮어써도 됨
    return {
      ...cm,
      ...bm,
      equippedBadges: normalizeList(
        pick(bm, "equippedBadges", "badges", "equipped_badges")
      ),
    };
  });

  // 2) 캐릭터 API에 없는 멤버가 badges API에만 있을 수도 있으니 추가
  const existingUids = new Set(merged.map((m) => getUserId(m)).filter(Boolean));
  for (const bm of badgeMembers) {
    const uid = getUserId(bm);
    if (uid == null || existingUids.has(uid)) continue;

    merged.push({
      ...bm,
      equippedItems: [], // 없으면 빈 배열
      equippedBadges: normalizeList(
        pick(bm, "equippedBadges", "badges", "equipped_badges")
      ),
    });
  }

  return merged;
}

/**
 * ✅ 팀원들 프리뷰 Row/그리드
 *
 * - fetcher(teamId): "캐릭터/아이템" 팀원 조회 (기존 그대로)
 * - badgesFetcher(teamId): ✅ NEW "뱃지" 팀원 조회
 *   - GET /api/badges/team/{teamId}/members
 *
 * 두 결과를 userId로 머지해서 MemberCharacterPreview에 넘김
 */
export function TeamCharactersPreview({
  teamId,
  fetcher, // (teamId) => Promise<list>   (캐릭터/아이템)
  badgesFetcher = null, // (teamId) => Promise<list>   (뱃지)
  max = 4,
  scale = 0.38,
  showNames = false,
  excludeUserId = null,
  className = "",
}) {
  const [members, setMembers] = useState([]);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let ignore = false;

    const run = async () => {
      if (!teamId || !fetcher) return;

      setErr(null);
      setLoading(true);

      try {
        // ✅ 캐릭터/뱃지 병렬 호출 (badgesFetcher 없으면 캐릭터만)
        const [charsRes, badgesRes] = await Promise.allSettled([
          fetcher(teamId),
          badgesFetcher ? badgesFetcher(teamId) : Promise.resolve([]),
        ]);

        const charsOk = charsRes.status === "fulfilled" ? charsRes.value : [];
        const badgesOk =
          badgesRes.status === "fulfilled" ? badgesRes.value : [];

        const merged = mergeMembersByUserId(charsOk, badgesOk);

        const filtered = excludeUserId
          ? merged.filter((m) => Number(getUserId(m)) !== Number(excludeUserId))
          : merged;

        if (!ignore) setMembers(filtered);

        // 둘 다 실패하면 에러 표시
        if (charsRes.status === "rejected" && badgesRes.status === "rejected") {
          const msg =
            charsRes.reason?.message ??
            badgesRes.reason?.message ??
            "멤버 프리뷰 로드 실패";
          if (!ignore) setErr(msg);
        }
      } catch (e) {
        if (!ignore) {
          setMembers([]);
          setErr(e?.message ?? "멤버 프리뷰 로드 실패");
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    run();
    return () => {
      ignore = true;
    };
  }, [teamId, fetcher, badgesFetcher, excludeUserId]);

  const sliced = members.slice(0, Math.max(0, max));

  return (
    <div className={`cp-team ${className}`}>
      {sliced.length === 0 ? (
        <div className="cp-team-empty">
          {loading ? "" : err ? "미리보기 없음" : ""}
        </div>
      ) : (
        <div className="cp-team-row">
          {sliced.map((m) => (
            <MemberCharacterPreview
              key={`${getUserId(m) ?? "u"}-${m?.username ?? m?.name ?? "x"}`}
              member={m}
              scale={scale}
              showName={showNames}
            />
          ))}
        </div>
      )}
    </div>
  );
}
