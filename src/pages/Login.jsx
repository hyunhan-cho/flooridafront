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

      // 1) 로그인 (services/auth.js에서 token 저장 + data return)
      const loginRes = await login({ email, password });

      const signupComplete = localStorage.getItem("signup_complete") === "true";

      const firstLoginBonusGiven = Boolean(loginRes?.firstLoginBonusGiven) || signupComplete;
      const dailyRewardGiven = Boolean(loginRes?.dailyRewardGiven) || firstLoginBonusGiven;

      // 2) 프로필 조회로 온보딩 완료 여부 판단
      let needsOnboarding = false;
      try {
        const profile = await getMyProfile();
        console.log("로그인 후 프로필 조회 결과:", profile);

        const hasOnboarding =
          profile && profile.planningTendency && profile.dailyStudyHours;

        needsOnboarding = !hasOnboarding;
      } catch (err) {
        console.error("프로필 조회 실패(신규/미생성 가능):", err);
        needsOnboarding = true;
      }

      // ✅✅✅ 핵심: 로그인 직후엔 Home으로 보내서
      // 50 → 10 → 뱃지(있으면) 순서 팝업 처리
      // 온보딩 필요하면 Home에서 팝업 끝난 뒤 /tendency로 이동
      const state = {
        dailyRewardGiven,
        firstLoginBonusGiven,
        isFirstLogin: firstLoginBonusGiven, // 기존 호환
        needsOnboarding,
      };

      if (signupComplete) {
        localStorage.removeItem("signup_complete");
      }

      // 새로고침/리렌더로 location.state 유실될 수 있어 sessionStorage에도 저장
      sessionStorage.setItem("home_entry_flags", JSON.stringify(state));

      navigate("/home", { state });
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

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLogin();
            }}
          >
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
            />

            {error && (
              <div style={{ color: "#ef4444", fontSize: 12, marginTop: 8 }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              className="login-button"
              disabled={loading}
            >
              {loading ? "로그인 중…" : "플로리다 시작!"}
            </button>
          </form>

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
