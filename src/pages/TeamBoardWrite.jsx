import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import TeamHeader from "../components/TeamHeader.jsx";
import "../App.css";
import "./TeamBoardWrite.css";

import { createTeamBoard } from "../services/teamBoard.js";

export default function TeamBoardWrite() {
  const navigate = useNavigate();
  const { teamId: teamIdParam } = useParams();
  const teamId = Number(teamIdParam);

  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const onSubmit = async () => {
    const text = content.trim();
    if (!text || saving) return;

    try {
      setSaving(true);
      setErr("");
      const res = await createTeamBoard(teamId, { content: text });

      // 생성 응답이 뭐든, 일단 목록으로 보내도 UX는 피그마랑 동일
      // (res.boardId가 확실히 오면 상세로 보내고 싶으면 말해줘. 스키마 한 장만 더 캡처하면 딱 고정 가능)
      navigate(`/teamboard/${teamId}`, { replace: true });
    } catch (e) {
      setErr(e?.message ?? "게시글 작성에 실패했어요.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="tp-write-page">
      {/* ✅ 추가: 상단 TeamHeader (팀 플랜) */}
      <TeamHeader />

      {/* ✅ 기존 헤더(글 작성하기/설명/뒤로가기)는 그대로 아래로 내려옴 */}
      <div className="tp-board-header">
        <div className="tp-board-header-inner">
          <div className="tp-write-title-row">
            <button
              className="tp-back-btn"
              onClick={() => navigate(-1)}
              aria-label="뒤로"
            >
              ‹
            </button>
            <div className="tp-write-title">글 작성하기</div>
            <div />
          </div>
          <div className="tp-write-desc">
            게시글을 써서 팀원들과 공유할 수 있어요.
          </div>
        </div>
      </div>

      <div className="tp-write-content">
        <div className="tp-write-card">
          <textarea
            className="tp-write-textarea"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="게시글 내용을 입력하세요"
          />
          {err && <div className="tp-write-error">{err}</div>}

          <button
            className="tp-upload-btn"
            onClick={onSubmit}
            disabled={saving}
          >
            {saving ? "업로드 중..." : "업로드하기"}
          </button>
        </div>
      </div>

      <Navbar />
    </div>
  );
}
