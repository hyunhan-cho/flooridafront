// pages/BadgeList.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import PersonalHeader from "../components/PersonalHeader.jsx";
import { getMyBadges } from "../services/api.js";
import { AUTH_TOKEN_KEY } from "../config.js";
import settingIcon from "../assets/navvar/button_setting.png";

export default function BadgeList() {
  const navigate = useNavigate();
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadBadges = async () => {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const data = await getMyBadges();
        if (Array.isArray(data)) {
          setBadges(data);
        }
      } catch (error) {
        console.error("뱃지 목록 로드 실패:", error);
      } finally {
        setLoading(false);
      }
    };

    loadBadges();
  }, []);

  return (
    <div
      className="app home-view"
      style={{ background: "#DFDFDF", minHeight: "100vh" }}
    >
      <PersonalHeader icon={settingIcon} title="마이페이지" />

      <main
        className="page-content"
        style={{
          width: "100%",
          maxWidth: "var(--panel-width)",
          margin: "0 auto",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          background: "#DFDFDF",
          height: "calc(100vh - 120px)",
        }}
      >
        <div
          style={{
            background: "#ffffff",
            borderRadius: "18px",
            padding: "24px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            display: "flex",
            flexDirection: "column",
            gap: "24px",
            height: "100%",
            overflow: "hidden",
          }}
        >
          {/* 헤더 */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: "100%",
              gap: "8px",
            }}
          >
            <button
              onClick={() => navigate("/mypage")}
              style={{
                background: "transparent",
                border: "none",
                fontSize: "20px",
                cursor: "pointer",
                color: "#0A7C88",
                padding: "4px",
                alignSelf: "flex-start",
                marginBottom: "4px",
              }}
            >
              &lt;
            </button>
            <h2
              style={{
                fontSize: "18px",
                fontWeight: 700,
                color: "#0A7C88",
                margin: 0,
                fontFamily: "var(--font-sans)",
              }}
            >
              획득한 뱃지
            </h2>
          </div>

          {/* 설명 텍스트 */}
          <p
            style={{
              fontSize: "14px",
              color: "#6b7280",
              margin: 0,
              fontFamily: "var(--font-sans)",
              lineHeight: "1.5",
            }}
          >
            출석을 많이 할수록 다양한 뱃지가 생겨요.
          </p>

          {/* 뱃지 목록 */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              minHeight: 0,
            }}
          >
            {loading ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "40px",
                  color: "#6b7280",
                  fontFamily: "var(--font-sans)",
                }}
              >
                로딩 중...
              </div>
            ) : badges.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "40px",
                  color: "#6b7280",
                  fontFamily: "var(--font-sans)",
                }}
              >
                획득한 뱃지가 없습니다.
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "16px",
                  width: "100%",
                  paddingRight: "8px",
                }}
              >
              {badges.map((badge) => (
                <div
                  key={badge.badgeId}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      aspectRatio: "1",
                      borderRadius: "12px",
                      background: "#f3f4f6",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                      border: "2px solid #e5e7eb",
                    }}
                  >
                    {badge.imageUrl ? (
                      <img
                        src={badge.imageUrl}
                        alt={badge.name}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "contain",
                          imageRendering: "pixelated",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "48px",
                        }}
                      >
                        🏆
                      </div>
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "#111827",
                      textAlign: "center",
                      fontFamily: "var(--font-sans)",
                      wordBreak: "keep-all",
                    }}
                  >
                    {badge.name || badge.description || "뱃지"}
                  </span>
                </div>
              ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <Navbar />
    </div>
  );
}

