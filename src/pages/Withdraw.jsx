// src/pages/Withdraw.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import PersonalHeader from "../components/PersonalHeader.jsx";
import { API_BASE_URL, AUTH_TOKEN_KEY } from "../config.js";
import settingIcon from "../assets/navvar/button_setting.png";

const PRIMARY_COLOR = "#0A7C88";

export default function Withdraw() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleWithdraw = async () => {
    if (!password) {
      alert("비밀번호를 입력해주세요.");
      return;
    }

    if (!agreed) {
      alert("회원 탈퇴에 동의해주세요.");
      return;
    }

    if (!window.confirm("정말 회원 탈퇴를 하시겠습니까? 모든 데이터가 삭제되며 복구할 수 없습니다.")) {
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      if (!token) {
        alert("로그인이 필요합니다.");
        navigate("/login");
        return;
      }

      // 회원 탈퇴 API 호출 (DELETE /api/me)
      const res = await fetch(`${API_BASE_URL.replace(/\/$/, "")}/api/me`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          password: password,
          confirmed: true,
        }),
      });

      if (res.status === 401) {
        alert("비밀번호가 일치하지 않습니다.");
        setLoading(false);
        return;
      }

      if (!res.ok && res.status !== 204) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "회원 탈퇴에 실패했습니다.");
      }

      // 탈퇴 성공 (204 No Content)
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem("AUTH_USER_KEY");

      alert("회원 탈퇴가 완료되었습니다.");
      navigate("/login");
    } catch (error) {
      console.error("회원 탈퇴 실패:", error);
      alert(error.message || "회원 탈퇴에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app home-view" style={{ background: "#DFDFDF", minHeight: "100vh" }}>
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
                color: PRIMARY_COLOR,
                margin: 0,
                fontFamily: "var(--font-sans)",
              }}
            >
              회원 탈퇴
            </h2>
            {/* 경고 메시지 */}
            <p
              style={{
                fontSize: "14px",
                color: "#6b7280",
                margin: 0,
                fontFamily: "var(--font-sans)",
                lineHeight: "1.5",
              }}
            >
              회원 탈퇴 시, 모든 데이터가 삭제되며 복구할 수 없습니다.
            </p>
          </div>

          {/* 비밀번호 확인 섹션 */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <label
              style={{
                fontSize: "16px",
                fontWeight: 700,
                color: "#111827",
                fontFamily: "var(--font-sans)",
              }}
            >
              비밀번호 확인
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="현재 비밀번호를 입력하세요"
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: "12px",
                border: "1px solid #d1d5db",
                fontSize: "14px",
                fontFamily: "var(--font-sans)",
                background: "#ffffff",
                color: "#111827",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* 동의 체크박스 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <input
              type="checkbox"
              id="withdraw-agree"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              style={{
                width: "20px",
                height: "20px",
                cursor: "pointer",
                accentColor: PRIMARY_COLOR,
              }}
            />
            <label
              htmlFor="withdraw-agree"
              style={{
                fontSize: "14px",
                color: "#111827",
                fontFamily: "var(--font-sans)",
                cursor: "pointer",
                flex: 1,
              }}
            >
              위 내용을 확인했으며, 회원 탈퇴에 동의합니다.
            </label>
          </div>

          {/* 탈퇴하기 버튼 */}
          <button
            onClick={handleWithdraw}
            disabled={loading}
            style={{
              width: "100%",
              background: loading ? "#9ca3af" : PRIMARY_COLOR,
              color: "#ffffff",
              border: "none",
              borderRadius: "12px",
              padding: "14px",
              fontSize: "14px",
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "var(--font-sans)",
              marginTop: "8px",
            }}
          >
            {loading ? "처리 중..." : "탈퇴하기"}
          </button>
        </div>
      </main>

      <Navbar />
    </div>
  );
}

