// src/pages/TendencyInfo.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import BackButton from "../components/BackButton.jsx";
import { saveTendency } from "../services/tendency.js";

const PLANNING_OPTIONS = [
  "할 일을 최대한 미룬다",
  "계획은 세우는데 실천하지 못한다",
  "꼼꼼하게 계획을 세우고 이행한다",
];

const HOURS_OPTIONS = ["0-1", "1-3", "3-6", "6-10", "10시간 이상"];

const PRIMARY_COLOR = "var(--brand-teal)";

const styles = {
  section: {
    marginTop: 20,
  },
  title: {
    fontSize: 12,
    fontWeight: 600,
    color: "#374151",
    marginBottom: 8,
  },
  box: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    padding: "10px 12px",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    boxShadow: "0 0 0 1px rgba(0,0,0,0.03) inset",
  },
  boxRow: {
    flexDirection: "row",
    gap: 4,
  },
  chip: {
    flex: 1,
    padding: "10px 12px",
    borderRadius: 5,
    backgroundColor: "#E1E1E1",
    fontSize: 11,
    color: "#4b5563",
    textAlign: "center",
    cursor: "pointer",
    transition:
      "background-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease, transform 0.05s ease",
  },
  chipSelected: {
    backgroundColor: PRIMARY_COLOR,
    color: "#ffffff",
    border: "none",
    boxShadow: "0 4px 10px rgba(0,0,0,0.25)",
  },

  chipSquare: {
    aspectRatio: "1 / 1",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
  },
  chipRowGap: {
    marginLeft: 4,
  },
  skip: {
    marginTop: 24,
    marginBottom: 2,
    background: "transparent",
    border: "none",
    fontSize: 13,
    color: "#6b7280",
    textDecoration: "underline",
    cursor: "pointer",
    display: "block", // 버튼을 블록으로
    width: "100%", // 카드 안에서 가입 버튼이랑 같은 폭
    textAlign: "center",
  },
};

export default function TendencyInfo() {
  const navigate = useNavigate();

  const [planningTendency, setPlanningTendency] = React.useState("");
  const [dailyStudyHours, setDailyStudyHours] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  const handleSubmit = async (skip = false) => {
    setError("");

    // "나중에 하기" 버튼
    if (skip) {
      navigate("/home");
      return;
    }

    if (!planningTendency || !dailyStudyHours) {
      setError("모든 항목을 선택해주세요.");
      return;
    }

    try {
      setLoading(true);
      await saveTendency({ planningTendency, dailyStudyHours });
      navigate("/home");
    } catch (e) {
      setError(e?.data?.message || e.message || "정보 저장에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <BackButton onClick={() => navigate(-1)} />

      <div className="login-header">
        <img className="login-logo" src="/images/logo.png" alt="FLOORIDA" />
        <div className="login-tagline">매일 성장하는 당신의 학습 동반자</div>
      </div>

      <div className="login-surface">
        <div className="login-card">
          <h2 className="login-title">당신에 대해 더 알고 싶어요!</h2>
          <p className="login-subtitle">
            모든 항목은 설정에서 언제나 변경 가능합니다.
          </p>

          {/* 계획 성향 */}
          <section className="tendency-section" style={styles.section}>
            <div className="tendency-title" style={styles.title}>
              계획 성향
            </div>
            <div className="tendency-options" style={styles.box}>
              {PLANNING_OPTIONS.map((opt) => {
                const selected = planningTendency === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    style={{
                      ...styles.chip,
                      ...(selected ? styles.chipSelected : null),
                    }}
                    onClick={() => setPlanningTendency(opt)}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </section>

          {/* 하루 학습/작업 시간 */}
          <section className="tendency-section" style={styles.section}>
            <div className="tendency-title" style={styles.title}>
              하루에 몇 시간 학습/작업을 하시나요?
            </div>
            <div
              className="tendency-options tendency-options--row"
              style={{ ...styles.box, ...styles.boxRow }}
            >
              {HOURS_OPTIONS.map((opt, idx) => {
                const selected = dailyStudyHours === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    style={{
                      ...styles.chip,
                      ...styles.chipSquare, // ⬅️ 시간 칩만 정사각형 적용
                      ...(idx > 0 ? styles.chipRowGap : null),
                      ...(selected ? styles.chipSelected : null),
                    }}
                    onClick={() => setDailyStudyHours(opt)}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </section>

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

          {/* 나중에 하기 */}
          <button
            type="button"
            className="tendency-skip"
            style={styles.skip}
            onClick={() => handleSubmit(true)}
          >
            나중에 하기
          </button>

          {/* 가입 완료하기 */}
          <button
            className="login-button"
            type="button"
            onClick={() => handleSubmit(false)}
            disabled={loading}
          >
            {loading ? "저장 중…" : "가입 완료하기!"}
          </button>
        </div>
      </div>
    </div>
  );
}
