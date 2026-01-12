import React, { useEffect, useState, useMemo, memo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import TeamHeader from "../components/TeamHeader.jsx";
import "../App.css";
import "./TeamBoardList.css";

import { HeartIcon } from "../components/teamBoard/BoardIcons.jsx";
import { getTeamBoards } from "../services/teamBoard.js";
import { http } from "../services/api.js";

import baseChar from "../assets/ch/cha_1.png";

// ===================================
// 1. Helpers
// ===================================
function toNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function pick(obj, ...keys) {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return null;
}

function normalizeList(raw) {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.data)) return raw.data;
  if (Array.isArray(raw?.result)) return raw.result;
  if (Array.isArray(raw?.items)) return raw.items;
  if (Array.isArray(raw?.members)) return raw.members;
  return [];
}

function formatKDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}.${mm}.${dd}.`;
}

// ===================================
// 2. Avatar Logic (Same as Detail)
// ===================================
const BASE_W = 114;
const BASE_H = 126;

const LAYER_ORDER = {
  CHARACTER: 0,
  BASE: 0,
  FACE: 1,
  ACCESSORY: 2,
  BADGE: 3,
};

function layerRank(t) {
  const key = String(t ?? "").toUpperCase();
  return LAYER_ORDER[key] ?? 10;
}

function normalizeLayers(equippedItems, equippedBadges) {
  const items = Array.isArray(equippedItems) ? equippedItems : [];
  const badgesRaw = Array.isArray(equippedBadges) ? equippedBadges : [];
  const badges = badgesRaw
    .filter((b) => b?.equipped === true)
    .map((b) => ({ ...b, __layerType: "BADGE" }));

  const merged = [
    ...items.map((x) => ({ ...x, __layerType: x?.itemType })),
    ...badges,
  ];

  const cleaned = merged
    .map((l) => {
      const imageUrl = pick(l, "imageUrl", "imgUrl", "url");
      const offsetX = toNum(pick(l, "offsetX", "x", "left"), 0);
      const offsetY = toNum(pick(l, "offsetY", "y", "top"), 0);
      const width = toNum(pick(l, "width", "w"), 0);
      const height = toNum(pick(l, "height", "h"), 0);
      return { ...l, imageUrl, offsetX, offsetY, width, height };
    })
    .filter((l) => !!l.imageUrl);

  cleaned.sort((a, b) => layerRank(a.__layerType) - layerRank(b.__layerType));
  return cleaned;
}

function computeBBox(layers) {
  const valid = (layers || []).filter(
    (l) =>
      Number.isFinite(l.offsetX) &&
      Number.isFinite(l.offsetY) &&
      Number.isFinite(l.width) &&
      Number.isFinite(l.height) &&
      l.width > 0 &&
      l.height > 0
  );

  let minX = 0;
  let minY = 0;
  let maxX = BASE_W;
  let maxY = BASE_H;

  for (const l of valid) {
    minX = Math.min(minX, l.offsetX);
    minY = Math.min(minY, l.offsetY);
    maxX = Math.max(maxX, l.offsetX + l.width);
    maxY = Math.max(maxY, l.offsetY + l.height);
  }

  const w = Math.max(1, maxX - minX);
  const h = Math.max(1, maxY - minY);

  return { minX, minY, w: Math.max(w, BASE_W), h: Math.max(h, BASE_H) };
}

const CharacterAvatar = memo(function CharacterAvatar({
  className,
  size = 44,
  member,
  badgeMember,
}) {
  const equippedItems = member?.equippedItems;
  const equippedBadges = badgeMember?.equippedBadges;

  const layers = useMemo(
    () => normalizeLayers(equippedItems, equippedBadges),
    [equippedItems, equippedBadges]
  );

  const bbox = useMemo(() => computeBBox(layers), [layers]);
  const scale = Math.min(size / bbox.w, size / bbox.h);

  const stageW = bbox.w * scale;
  const stageH = bbox.h * scale;
  const stageLeft = (size - stageW) / 2;
  const stageTop = (size - stageH) / 2;

  const baseLeft = stageLeft + (0 - bbox.minX) * scale;
  const baseTop = stageTop + (0 - bbox.minY) * scale;

  return (
    <div
      className={className} /* tp-avatar */
      style={{
        position: "relative",
        overflow: "hidden",
      }}
      aria-hidden="true"
    >
      <img
        src={baseChar}
        alt=""
        draggable={false}
        style={{
          position: "absolute",
          left: baseLeft,
          top: baseTop,
          width: BASE_W * scale,
          height: BASE_H * scale,
          objectFit: "contain",
          display: "block",
        }}
        onError={(e) => {
          e.currentTarget.style.display = "none";
        }}
      />
      {layers.map((l, idx) => (
        <img
          key={`${l.itemId ?? l.badgeId ?? idx}-${idx}`}
          src={l.imageUrl}
          alt=""
          draggable={false}
          style={{
            position: "absolute",
            left: stageLeft + (l.offsetX - bbox.minX) * scale,
            top: stageTop + (l.offsetY - bbox.minY) * scale,
            width: l.width * scale,
            height: l.height * scale,
            objectFit: "contain",
            display: "block",
            zIndex: 10 + idx,
          }}
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      ))}
    </div>
  );
});

// ===================================
// 3. Main Component
// ===================================

export default function TeamBoardList() {
  const navigate = useNavigate();
  const { teamId: teamIdParam } = useParams();
  const teamId = Number(teamIdParam);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [posts, setPosts] = useState([]);

  // 팀원 캐릭터/뱃지
  const [membersChars, setMembersChars] = useState([]);
  const [membersBadges, setMembersBadges] = useState([]);

  // Data Loading
  useEffect(() => {
    let ignore = false;

    const loadData = async () => {
      if (!Number.isFinite(teamId)) return;
      try {
        setLoading(true);
        setError("");

        // 1. 게시글 목록
        const res = await getTeamBoards(teamId);
        if (ignore) return;
        setPosts(normalizeList(res));

        // 2. 캐릭터/뱃지 (비동기 병렬)
        Promise.allSettled([
          http.get(`/api/items/${teamId}/characters`),
          http.get(`/api/badges/team/${teamId}/members`),
        ]).then(([cRes, bRes]) => {
          if (ignore) return;
          const chars =
            cRes.status === "fulfilled" ? normalizeList(cRes.value) : [];
          const badges =
            bRes.status === "fulfilled" ? normalizeList(bRes.value) : [];
          setMembersChars(chars);
          setMembersBadges(badges);
        });
      } catch (e) {
        if (!ignore) {
          setError(e?.message ?? "게시판을 불러오지 못했어요.");
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    loadData();
    return () => {
      ignore = true;
    };
  }, [teamId]);

  // Visual Lookup Maps
  const { charById, charByName, badgeById, badgeByName } = useMemo(() => {
    const cId = new Map();
    const cName = new Map();
    for (const m of membersChars) {
      const id = toNum(pick(m, "userId", "userid", "writerId"));
      const name = pick(m, "username", "userName", "name");
      if (id) cId.set(id, m);
      if (name) cName.set(String(name), m);
    }
    const bId = new Map();
    const bName = new Map();
    for (const m of membersBadges) {
      const id = toNum(pick(m, "userId", "userid", "writerId"));
      const name = pick(m, "username", "userName", "name");
      if (id) bId.set(id, m);
      if (name) bName.set(String(name), m);
    }
    return { charById: cId, charByName: cName, badgeById: bId, badgeByName: bName };
  }, [membersChars, membersBadges]);

  const resolveMember = (uId, uName) =>
    (uId && charById.get(uId)) || charByName.get(String(uName));
  const resolveBadgeMember = (uId, uName) =>
    (uId && badgeById.get(uId)) || badgeByName.get(String(uName));

  return (
    <div className="tp-board-page">
      <TeamHeader />

      <div className="tp-board-header">
        <div className="tp-board-header-inner">
          <div className="tp-board-title-row">
            <button
              className="tp-back-btn"
              onClick={() => navigate(`/teamplacehome/${teamId}`)}
              aria-label="뒤로"
            >
              ‹
            </button>
            <div className="tp-board-subtitle">
              <div className="tp-board-subtitle-title">팀 게시판</div>
              <div className="tp-board-subtitle-desc">
                자유롭게 소통하는 공간입니다.
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                className="tp-write-btn"
                onClick={() => navigate(`/teamboard/${teamId}/write`)}
              >
                글쓰기
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="tp-board-content">
        {loading ? (
          <div className="tp-empty">불러오는 중...</div>
        ) : error ? (
          <div className="tp-error">{error}</div>
        ) : posts.length === 0 ? (
          <div className="tp-empty">작성된 글이 없어요.</div>
        ) : (
          <div className="tp-board-list">
            {posts.map((post) => {
              const pId = post.boardId ?? post.id;
              const wId = toNum(
                pick(post, "writerId", "userId", "authorId", "userid")
              );
              const wName = pick(post, "writerName", "username") ?? "익명";
              const likeCount = toNum(
                pick(post, "likeCount", "likes"),
                0
              );
              const isLiked = !!(
                post.liked ??
                post.isLiked ??
                post.myLike ??
                post._liked
              );

              const member = resolveMember(wId, wName);
              const bMember = resolveBadgeMember(wId, wName);

              return (
                <div
                  key={pId}
                  className="tp-board-card"
                  onClick={() => navigate(`/teamboard/${teamId}/${pId}`)}
                >
                  <div className="tp-board-card-top">
                    <CharacterAvatar
                      className="tp-avatar"
                      size={44}
                      member={member}
                      badgeMember={bMember}
                    />
                    <div className="tp-board-meta">
                      <div className="tp-board-author">{wName}</div>
                      <div className="tp-board-date">
                        {formatKDate(post.createdAt)}
                      </div>
                    </div>
                  </div>

                  <div className="tp-board-text">{post.content}</div>

                  <div className="tp-board-card-bottom">
                    <div
                      className={`tp-react-btn tp-react-static ${isLiked ? "is-liked" : ""
                        }`}
                    >
                      <HeartIcon filled={isLiked} />
                      <span className="tp-react-count">{likeCount}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Navbar />
    </div>
  );
}
