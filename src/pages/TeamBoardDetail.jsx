import React, { useEffect, useMemo, useState, memo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import TeamHeader from "../components/TeamHeader.jsx";
import "../App.css";
import "./TeamBoardDetail.css";

import { HeartIcon } from "../components/teamBoard/BoardIcons.jsx";
import {
  createTeamBoardComment,
  getTeamBoard,
  getTeamBoardComments,
  toggleTeamBoardLike,
} from "../services/teamBoard.js";
import { http, getTeamCharacters } from "../services/api.js";

// ✅ 기본 바디
import baseChar from "../assets/ch/cha_1.png";

function toNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function getUserId(obj) {
  const v = obj?.userId ?? obj?.userid ?? obj?.writerId ?? obj?.authorId;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
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
  if (Array.isArray(raw?.comments)) return raw.comments;
  if (Array.isArray(raw?.data)) return raw.data;
  if (Array.isArray(raw?.result)) return raw.result;
  if (Array.isArray(raw?.items)) return raw.items;
  if (Array.isArray(raw?.members)) return raw.members;
  return [];
}

function formatKDateTime(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yy}.${mm}.${dd}.`;
}

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

// ✅ bbox는 "레이어 + 기본 캐릭터(0,0,114,126)"를 함께 포함해야 좌표가 안 틀어짐
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

// ✅ (중요) 스케일링 로직 절대 건드리지 않음: transform 미사용, 좌표/크기 자체를 스케일링
const CharacterAvatar = memo(function CharacterAvatar({
  className,
  size = 48,
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
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        overflow: "hidden",
        position: "relative",
        flex: "0 0 auto",
        background: "#FFFFFF",
        border: "1px solid rgba(0,0,0,0.10)",
      }}
      aria-hidden="true"
    >
      {/* ✅ 기본 바디 */}
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

      {/* ✅ 아이템/뱃지 레이어 */}
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
          }}
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      ))}
    </div>
  );
});

export default function TeamBoardDetail() {
  const navigate = useNavigate();
  const { teamId: teamIdParam, boardId: boardIdParam } = useParams();
  const teamId = Number(teamIdParam);
  const boardId = Number(boardIdParam);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [post, setPost] = useState(null);

  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentsErr, setCommentsErr] = useState("");
  const [comments, setComments] = useState([]);

  const [commentText, setCommentText] = useState("");
  const [sending, setSending] = useState(false);
  const [liking, setLiking] = useState(false);

  // ✅ 팀원 캐릭터/뱃지 상태
  const [membersChars, setMembersChars] = useState([]);
  const [membersBadges, setMembersBadges] = useState([]);

  useEffect(() => {
    let ignore = false;

    const loadVisuals = async () => {
      if (!Number.isFinite(teamId)) return;

      try {
        const [charsRes, badgesRes] = await Promise.allSettled([
          getTeamCharacters(teamId),
          http.get(`/api/badges/team/${teamId}/members`),
        ]);

        if (ignore) return;

        const chars =
          charsRes.status === "fulfilled"
            ? (Array.isArray(charsRes.value) ? charsRes.value : normalizeList(charsRes.value))
            : [];
        const badges =
          badgesRes.status === "fulfilled"
            ? normalizeList(badgesRes.value)
            : [];

        setMembersChars(chars);
        setMembersBadges(badges);
      } catch (_) {
        if (!ignore) {
          setMembersChars([]);
          setMembersBadges([]);
        }
      }
    };

    loadVisuals();
    return () => {
      ignore = true;
    };
  }, [teamId]);

  const { charById, charByName, badgeById, badgeByName } = useMemo(() => {
    const cId = new Map();
    const cName = new Map();
    for (const m of Array.isArray(membersChars) ? membersChars : []) {
      const id = getUserId(m);
      const name = pick(m, "username", "userName", "name");
      if (id != null) cId.set(id, m);
      if (name) cName.set(String(name), m);
    }

    const bId = new Map();
    const bName = new Map();
    for (const m of Array.isArray(membersBadges) ? membersBadges : []) {
      const id = getUserId(m);
      const name = pick(m, "username", "userName", "name");
      if (id != null) bId.set(id, m);
      if (name) bName.set(String(name), m);
    }

    return {
      charById: cId,
      charByName: cName,
      badgeById: bId,
      badgeByName: bName,
    };
  }, [membersChars, membersBadges]);

  const resolveMember = (userId, username) => {
    if (userId != null)
      return charById.get(userId) ?? charByName.get(String(username));
    return charByName.get(String(username));
  };

  const resolveBadgeMember = (userId, username) => {
    if (userId != null)
      return badgeById.get(userId) ?? badgeByName.get(String(username));
    return badgeByName.get(String(username));
  };

  useEffect(() => {
    let ignore = false;

    const load = async () => {
      if (!Number.isFinite(teamId) || !Number.isFinite(boardId)) return;

      try {
        setLoading(true);
        setErr("");
        const data = await getTeamBoard(teamId, boardId);
        if (ignore) return;

        setPost({
          ...data,
          _liked: !!(
            data?.liked ??
            data?.isLiked ??
            data?.myLike ??
            data?._liked
          ),
        });
      } catch (e) {
        if (!ignore) setErr(e?.message ?? "게시글을 불러오지 못했어요.");
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    load();
    return () => {
      ignore = true;
    };
  }, [teamId, boardId]);

  const loadComments = async () => {
    if (!Number.isFinite(teamId) || !Number.isFinite(boardId)) return;
    try {
      setCommentsLoading(true);
      setCommentsErr("");
      const raw = await getTeamBoardComments(teamId, boardId);
      setComments(normalizeList(raw));
    } catch (e) {
      setCommentsErr(e?.message ?? "댓글을 불러오지 못했어요.");
    } finally {
      setCommentsLoading(false);
    }
  };

  useEffect(() => {
    loadComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId, boardId]);

  const vm = useMemo(() => {
    const p = post || {};
    return {
      writerId: getUserId(p),
      writerName: p.writerName ?? p.username ?? "익명",
      createdAt: p.createdAt,
      content: p.content ?? "",
      likeCount: toNum(p.likeCount, 0),
      liked: !!(p.liked ?? p.isLiked ?? p.myLike ?? p._liked),
    };
  }, [post]);

  const onToggleLike = async () => {
    if (!post || liking) return;

    const prevLiked = !!(
      post.liked ??
      post.isLiked ??
      post.myLike ??
      post._liked
    );
    const prevCount = toNum(post.likeCount, 0);

    // Optimistic Update
    setPost((prev) => {
      if (!prev) return prev;
      const nextLiked = !prevLiked;
      const nextCount = Math.max(0, prevCount + (nextLiked ? 1 : -1));
      return {
        ...prev,
        _liked: nextLiked,
        liked: nextLiked,
        likeCount: nextCount,
      };
    });

    setLiking(true);
    try {
      const res = await toggleTeamBoardLike(teamId, boardId);
      if (res && typeof res === "object" && res.likeCount != null) {
        setPost((prev) =>
          prev
            ? { ...prev, likeCount: toNum(res.likeCount, prev.likeCount) }
            : prev
        );
      }
    } catch (_) {
      // 에러 시 원복
      setPost((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          _liked: prevLiked,
          liked: prevLiked,
          likeCount: prevCount,
        };
      });
    } finally {
      setLiking(false);
    }
  };

  const onSendComment = async () => {
    const text = commentText.trim();
    if (!text || sending) return;

    try {
      setSending(true);
      setCommentsErr("");
      await createTeamBoardComment(teamId, boardId, { content: text });
      setCommentText("");
      await loadComments();
    } catch (e) {
      setCommentsErr(e?.message ?? "댓글 작성에 실패했어요.");
    } finally {
      setSending(false);
    }
  };

  const postMember = resolveMember(vm.writerId, vm.writerName);
  const postBadgeMember = resolveBadgeMember(vm.writerId, vm.writerName);

  return (
    <div className="tp-board-detail-page">
      {/* ✅ 추가: 상단 TeamHeader */}
      <TeamHeader />

      <div className="tp-board-header">
        <div className="tp-board-header-inner">
          <div className="tp-board-title-row">
            <button
              className="tp-back-btn"
              onClick={() => navigate(-1)}
              aria-label="뒤로"
            >
              ‹
            </button>
            <div className="tp-board-subtitle">
              <div className="tp-board-subtitle-title"></div>
              {/* ✅ 여기서만 삭제: tp-board-subtitle-desc(소통 멘트) */}
            </div>
            <div />
          </div>
        </div>
      </div>

      <div className="tp-board-content">
        {loading ? (
          <div className="tp-empty">불러오는 중...</div>
        ) : err ? (
          <div className="tp-error">{err}</div>
        ) : (
          <div className="tp-post-card tp-figma-frame">
            {/* ====== (1) 게시글 헤더 ====== */}
            <CharacterAvatar
              className="tp-figma-post-avatar"
              size={48}
              member={postMember}
              badgeMember={postBadgeMember}
            />

            <div className="tp-figma-post-author">{vm.writerName}</div>
            <div className="tp-figma-post-date">
              {formatKDateTime(vm.createdAt)}
            </div>

            <button
              className={`tp-like-pill tp-figma-like ${vm.liked ? "is-liked" : ""
                }`}
              onClick={onToggleLike}
              type="button"
              aria-label="좋아요"
            >
              <HeartIcon filled={vm.liked} className="tp-like-icon" />
              <span className="tp-like-count">{vm.likeCount}</span>
            </button>

            {/* ====== (2) 게시글 본문 박스 ====== */}
            <div className="tp-figma-post-body-box">
              <div className="tp-figma-post-body-text">
                {vm.content || "내용이 없어요."}
              </div>
            </div>

            {/* ====== (3) 댓글 입력 ====== */}
            <div className="tp-figma-comment-input-frame">
              <input
                className="tp-figma-comment-input"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="댓글을 입력하세요"
                onKeyDown={(e) => e.key === "Enter" && onSendComment()}
              />
              <button
                className="tp-figma-comment-send"
                onClick={onSendComment}
                disabled={sending}
              >
                {sending ? "..." : "댓글 남기기"}
              </button>
            </div>

            {/* ====== (4) 댓글 리스트 영역 (스크롤) ====== */}
            <div className="tp-figma-comments-area">
              {commentsLoading ? (
                <div className="tp-figma-state">댓글 불러오는 중...</div>
              ) : commentsErr ? (
                <div className="tp-figma-state tp-figma-state-error">
                  {commentsErr}
                </div>
              ) : comments.length === 0 ? (
                <div className="tp-figma-state">첫 댓글을 남겨보세요.</div>
              ) : (
                comments.map((c, idx) => {
                  const cid = c.commentId ?? c.id ?? idx;
                  const authorId = getUserId(c);
                  const author = c.writerName ?? c.username ?? "익명";
                  const createdAt = c.createdAt;
                  const content = c.content ?? "";

                  const cm = resolveMember(authorId, author);
                  const bm = resolveBadgeMember(authorId, author);

                  return (
                    <div className="tp-figma-comment-card" key={cid}>
                      <CharacterAvatar
                        className="tp-figma-comment-avatar"
                        size={48}
                        member={cm}
                        badgeMember={bm}
                      />
                      <div className="tp-figma-comment-author">{author}</div>
                      <div className="tp-figma-comment-date">
                        {formatKDateTime(createdAt)}
                      </div>
                      <div className="tp-figma-comment-text">{content}</div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      <Navbar />
    </div>
  );
}
