// src/pages/Login.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import BackButton from "../components/BackButton.jsx";
import { login } from "../services/auth.js";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  const handleLogin = async () => {
    setError("");

    if (!email || !password) {
      setError("이메일과 비밀번호를 입력하세요.");
      return;
    }

    try {
      setLoading(true);
      await login({ email, password });
      // ✅ 로그인 성공 → 홈으로 이동
      navigate("/home");
    } catch (e) {
      setError(e?.message || "로그인에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* 뒤로가기: 스플래시나 이전 페이지로 */}
      <BackButton onClick={() => navigate("/")} />

      <div className="login-header">
        <img className="login-logo" src="/images/logo.png" alt="FLOORIDA" />
        <div className="login-tagline">매일 성장하는 당신의 학습 동반자</div>
      </div>

      <div className="login-surface">
        <div className="login-card">
          <h2 className="login-title">로그인</h2>
          <p className="login-subtitle">플로리다에 오신 것을 환영합니다!</p>

          {/* 이메일 */}
          <label className="login-label" htmlFor="email">
            아이디
          </label>
          <input
            id="email"
            className="login-input"
            type="email"
            placeholder="name1234@naver.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          {/* 비밀번호 */}
          <label className="login-label" htmlFor="password">
            비밀번호
          </label>
          <input
            id="password"
            className="login-input"
            type="password"
            placeholder="비밀번호를 입력하세요"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleLogin();
            }}
          />

          {error && (
            <div
              style={{
                color: "#ef4444",
                fontSize: 12,
                marginTop: 8,
              }}
            >
              {error}
            </div>
          )}

          <button
            className="login-button"
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? "로그인 중…" : "플로리다 시작!"}
          </button>

          <div className="login-footer">
            <span>계정이 없으신가요?</span>
            {/* a 태그로 하되, 새로고침 막고 클라이언트 라우팅 */}
            <a
              href="/signup"
              onClick={(e) => {
                e.preventDefault();
                navigate("/signup");
              }}
            >
              회원가입
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
