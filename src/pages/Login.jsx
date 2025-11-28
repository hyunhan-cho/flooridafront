// src/pages/Login.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import BackButton from "../components/BackButton.jsx";
import { login } from "../services/auth.js";
import { getMyProfile } from "../services/profile.js";

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

      // 1) 로그인 (여기서 토큰 localStorage에 저장된다고 가정)
      await login({ email, password });

      // 2) 프로필 조회해서 온보딩 완료 여부 확인
      try {
        const profile = await getMyProfile();

        const hasOnboarding =
          profile && profile.planningTendency && profile.dailyStudyHours;

        if (hasOnboarding) {
          // 이미 성향 정보 있는 유저 → 바로 홈
          navigate("/home");
        } else {
          // 아직 성향 정보 없는 유저 → 최초 로그인 → TendencyInfo
          navigate("/tendency");
        }
      } catch (err) {
        console.error("getMyProfile error:", err);
        // 프로필 조회가 깨지면 최소한 앱은 쓸 수 있게 홈으로 보냄
        navigate("/home");
      }
    } catch (e) {
      setError(e?.message || "로그인에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <BackButton onClick={() => navigate("/")} />

      <div className="login-header">
        <img className="login-logo" src="/images/logo.png" alt="FLOORIDA" />
        <div className="login-tagline">매일 성장하는 당신의 학습 동반자</div>
      </div>

      <div className="login-surface">
        <div className="login-card">
          <h2 className="login-title">로그인</h2>
          <p className="login-subtitle">플로리다에 오신 것을 환영합니다!</p>

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
