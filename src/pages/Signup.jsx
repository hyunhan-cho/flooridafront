// src/pages/Signup.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import BackButton from "../components/BackButton.jsx";
import { signup } from "../services/auth.js";

export default function Signup() {
  const navigate = useNavigate();

  const [username, setUsername] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [agree, setAgree] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  const handleSignup = async () => {
    setError("");

    if (!username || !email || !password) {
      setError("이름/이메일/비밀번호를 모두 입력하세요.");
      return;
    }
    if (!agree) {
      setError("약관에 동의해주세요.");
      return;
    }

    try {
      setLoading(true);
      await signup({ email, password, username });
      // ✅ 가입 성공 → 로그인 화면으로 이동
      localStorage.setItem("signup_complete", "true");
      navigate("/login");
    } catch (e) {
      setError(e?.message || "가입에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* 뒤로가기: 스플래시(또는 이전 페이지)로 */}
      <BackButton onClick={() => navigate("/")} />

      <div className="login-header">
        <img className="login-logo" src="/images/logo.png" alt="FLOORIDA" />
        <div className="login-tagline">매일 성장하는 당신의 학습 동반자</div>
      </div>

      <div className="login-surface">
        <div className="login-card">
          <h2 className="login-title">회원가입</h2>
          <p className="login-subtitle">새로운 여정을 시작하세요!</p>

          {/* 이름 */}
          <label className="login-label" htmlFor="username">
            이름
          </label>
          <input
            id="username"
            className="login-input"
            type="text"
            placeholder="홍길동"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          {/* 이메일 */}
          <label className="login-label" htmlFor="email">
            이메일
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
            placeholder="영문, 숫자 조합 7~20자"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSignup();
            }}
          />

          {/* 약관 동의 */}
          <label className="agree-row">
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
            />
            <span>이용약관 및 개인정보 처리에 동의합니다.</span>
          </label>

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
            onClick={handleSignup}
            disabled={loading}
          >
            {loading ? "가입 중…" : "가입하기"}
          </button>

          <div className="login-footer">
            <span>이미 가입하셨나요?</span>
            <a
              href="/login"
              onClick={(e) => {
                e.preventDefault();
                navigate("/login");
              }}
            >
              로그인
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
