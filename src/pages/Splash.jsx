import React from "react";
import { useNavigate } from "react-router-dom";
export default function Splash() {
  const navigate = useNavigate();

  // 별 파티클 생성 (첫 마운트 시 고정)
  const stars = React.useMemo(
    () =>
      Array.from({ length: 28 }).map(() => ({
        left: Math.random() * 100,
        top: Math.random() * 100,
        delay: Math.random() * 5,
        scale: 0.6 + Math.random() * 0.9,
      })),
    []
  );

  return (
    <div className="splash-page">
      {/* 배경 이펙트 레이어 */}
      <div className="splash-bg" aria-hidden="true" />
      <div className="splash-beams" aria-hidden="true" />
      <div className="splash-stars" aria-hidden="true">
        {stars.map((s, i) => (
          <span
            key={i}
            className="star"
            style={{
              left: `${s.left}%`,
              top: `${s.top}%`,
              animationDelay: `${s.delay}s`,
              transform: `scale(${s.scale})`,
            }}
          />
        ))}
      </div>

      {/* 액션 버튼 */}
      <div className="splash-actions">
        <button className="splash-btn neon" onClick={() => navigate("/login")}>
          로그인
        </button>
        <button
          className="splash-btn neon alt"
          onClick={() => navigate("/signup")}
        >
          회원가입
        </button>
      </div>

      {/* 태그라인 + 로고 */}
      <div className="splash-tagline glitch">한 층 한 층 올려보자</div>
      <div className="logo-wrap">
        <img className="splash-logo" src="/images/logo.png" alt="FLOORIDA" />
        <span className="logo-shine" aria-hidden="true" />
      </div>

      {/* 비네트 레이어 */}
      <div className="splash-vignette" aria-hidden="true" />
    </div>
  );
}
