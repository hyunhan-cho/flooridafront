import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// iOS Safari 감지
const isIOS = () => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
};

// 이미 설치된 앱인지 확인
const isStandalone = () => {
  return window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;
};

export default function Splash() {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // PWA 설치 이벤트 리스너
  useEffect(() => {
    // 이미 설치된 경우 버튼 숨김
    if (isStandalone()) {
      setShowInstallBtn(false);
      return;
    }

    // iOS Safari인 경우 수동 안내 버튼 표시
    if (isIOS()) {
      setShowInstallBtn(true);
      return;
    }

    // Chrome/Edge 등 beforeinstallprompt 지원 브라우저
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // 0.2초 후에도 beforeinstallprompt가 없으면 버튼 표시 (빠른 렌더링)
    const timeout = setTimeout(() => {
      if (!deferredPrompt) {
        setShowInstallBtn(true);
      }
    }, 200);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      clearTimeout(timeout);
    };
  }, [deferredPrompt]);

  // 앱 설치 핸들러
  const handleInstallClick = async () => {
    // iOS인 경우 가이드 모달 표시
    if (isIOS()) {
      setShowIOSGuide(true);
      return;
    }

    // beforeinstallprompt가 있는 경우 (Chrome/Edge)
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setShowInstallBtn(false);
      }
      setDeferredPrompt(null);
      return;
    }

    // 그 외 브라우저는 일반 안내
    alert("브라우저 메뉴에서 '홈 화면에 추가' 또는 '앱 설치'를 선택하세요.");
  };

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

      {/* ✅ 앱 설치 버튼 - 모든 브라우저 지원 */}
      {showInstallBtn && (
        <button
          className="install-app-btn"
          onClick={handleInstallClick}
          style={{
            marginTop: "32px",
            padding: "14px 32px",
            fontSize: "16px",
            fontWeight: 700,
            fontFamily: "inherit",
            background: "#ffffff",
            color: "#E8723A",
            border: "2px solid #E8723A",
            borderRadius: "999px",
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
            transition: "all 0.2s ease",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            zIndex: 50,
            position: "relative",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#FFF5F0";
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 6px 16px rgba(232, 114, 58, 0.3)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#ffffff";
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)";
          }}
        >
          <span style={{ fontSize: "18px" }}>⬇</span>
          앱으로 설치하기
        </button>
      )}

      {/* iOS 설치 가이드 모달 */}
      {showIOSGuide && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
          onClick={() => setShowIOSGuide(false)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "16px",
              padding: "24px",
              maxWidth: "320px",
              textAlign: "center",
              color: "#111827",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 16px", fontSize: "18px", fontWeight: 700 }}>
              iOS에서 앱 설치하기
            </h3>
            <p style={{ margin: "0 0 12px", fontSize: "14px", lineHeight: 1.6 }}>
              1. Safari 하단의 <strong>공유 버튼</strong> (□↑) 탭
            </p>
            <p style={{ margin: "0 0 12px", fontSize: "14px", lineHeight: 1.6 }}>
              2. <strong>"홈 화면에 추가"</strong> 선택
            </p>
            <p style={{ margin: "0 0 20px", fontSize: "14px", lineHeight: 1.6 }}>
              3. <strong>"추가"</strong> 버튼 탭
            </p>
            <button
              onClick={() => setShowIOSGuide(false)}
              style={{
                background: "#0A7C88",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                padding: "12px 24px",
                fontSize: "14px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              확인
            </button>
          </div>
        </div>
      )}

      {/* 비네트 레이어 */}
      <div className="splash-vignette" aria-hidden="true" />
    </div>
  );
}
