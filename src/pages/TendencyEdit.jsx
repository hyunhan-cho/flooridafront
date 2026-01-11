// src/pages/TendencyEdit.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import PersonalHeader from "../components/PersonalHeader.jsx";
import { saveTendency } from "../services/tendency.js";
import { getMyProfile } from "../services/profile.js";
import settingIcon from "../assets/navvar/button_setting.png";

// 계획 성향 옵션 (한국어 텍스트 -> API enum 값 매핑)
const PLANNING_OPTIONS = [
  { label: "할 일을 최대한 미룬다", value: "PROCRASTINATES" },
  { label: "계획은 세우는데 실천하지 못한다", value: "PLANS_ONLY" },
  { label: "꼼꼼하게 계획을 세우고 이행한다", value: "PLANS_AND_EXECUTES" },
];

// 하루 학습/작업 시간 옵션 (한국어 텍스트 -> API enum 값 매핑)
const HOURS_OPTIONS = [
  { label: "0-1", value: "HOURS_0_1" },
  { label: "1-3", value: "HOURS_1_3" },
  { label: "3-6", value: "HOURS_3_6" },
  { label: "6-10", value: "HOURS_6_10" },
  { label: "10시간 이상", value: "HOURS_10_PLUS" },
];

const PRIMARY_COLOR = "#0A7C88";

export default function TendencyEdit() {
  const navigate = useNavigate();
  const location = useLocation();
  const [planningTendency, setPlanningTendency] = useState("");
  const [dailyStudyHours, setDailyStudyHours] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  // 온보딩 정보 불러오기
  useEffect(() => {
    const loadTendency = async () => {
      try {
        setLoadingData(true);
        
        // 프로필에서 온보딩 정보 가져오기 (GET /api/me/onboarding은 지원되지 않음)
        try {
          const profileData = await getMyProfile();
          if (profileData) {
            if (profileData.planningTendency) {
              setPlanningTendency(profileData.planningTendency);
            }
            if (profileData.dailyStudyHours) {
              setDailyStudyHours(profileData.dailyStudyHours);
            }
          }
        } catch (profileError) {
          // 프로필에서도 가져올 수 없으면 빈 상태로 시작 (온보딩을 하지 않았을 수 있음)
          // 에러를 조용히 처리
        }
      } catch (error) {
        // 전체적인 에러 처리 (조용히 처리)
      } finally {
        setLoadingData(false);
      }
    };

    loadTendency();
  }, [location.pathname]); // 경로가 변경될 때마다 다시 로드

  const handleSave = async () => {
    setLoading(true);
    try {
      // API는 enum 값만 받거나 둘 다 선택하지 않아도 됨
      const result = await saveTendency({
        planningTendency: planningTendency || undefined,
        dailyStudyHours: dailyStudyHours || undefined,
      });
      
      // 저장 응답에서 정보를 받아서 상태 업데이트 (응답이 있는 경우)
      if (result) {
        if (result.planningTendency) {
          setPlanningTendency(result.planningTendency);
        }
        if (result.dailyStudyHours) {
          setDailyStudyHours(result.dailyStudyHours);
        }
      }
      
      navigate("/mypage");
    } catch (error) {
      console.error("성향 정보 저장 실패:", error);
      alert("성향 정보 저장에 실패했습니다.");
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
              성향 정보 수정
            </h2>
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
              AI가 계획을 플랜을 완성할 때 참고하는 정보입니다.
            </p>
          </div>

          {/* 계획 성향 섹션 */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <label
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: "#374151",
                fontFamily: "var(--font-sans)",
              }}
            >
              계획 성향
            </label>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                padding: "10px 12px",
                backgroundColor: "#FFFFFF",
                borderRadius: "8px",
                boxShadow: "0 0 0 1px rgba(0,0,0,0.1) inset",
              }}
            >
              {PLANNING_OPTIONS.map((option) => {
                const isSelected = planningTendency === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setPlanningTendency(option.value)}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      borderRadius: "8px",
                      border: "none",
                      background: isSelected ? PRIMARY_COLOR : "#E1E1E1",
                      color: isSelected ? "#ffffff" : "#4b5563",
                      fontSize: "13px",
                      fontWeight: isSelected ? 600 : 400,
                      cursor: "pointer",
                      fontFamily: "var(--font-sans)",
                      textAlign: "left",
                      transition: "all 0.15s ease",
                      boxShadow: isSelected
                        ? "0 4px 10px rgba(0,0,0,0.25)"
                        : "none",
                    }}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 하루 학습/작업 시간 섹션 */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <label
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: "#374151",
                fontFamily: "var(--font-sans)",
              }}
            >
              하루에 몇 시간 학습/작업을 하시나요?
            </label>
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                gap: "4px",
                flexWrap: "nowrap",
                padding: "10px 12px",
                backgroundColor: "#FFFFFF",
                borderRadius: "8px",
                boxShadow: "0 0 0 1px rgba(0,0,0,0.1) inset",
              }}
            >
              {HOURS_OPTIONS.map((option) => {
                const isSelected = dailyStudyHours === option.value;
                // "10시간 이상"의 경우 두 줄로 표시
                const isLongText = option.label === "10시간 이상";
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setDailyStudyHours(option.value)}
                    style={{
                      flex: "1 1 0",
                      minWidth: 0,
                      aspectRatio: "1 / 1",
                      padding: "10px 8px",
                      borderRadius: "8px",
                      border: "none",
                      background: isSelected ? PRIMARY_COLOR : "#E1E1E1",
                      color: isSelected ? "#ffffff" : "#4b5563",
                      fontSize: isLongText ? "9px" : "12px",
                      fontWeight: isSelected ? 600 : 400,
                      cursor: "pointer",
                      fontFamily: "var(--font-sans)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.15s ease",
                      boxShadow: isSelected
                        ? "0 4px 10px rgba(0,0,0,0.25)"
                        : "none",
                      whiteSpace: isLongText ? "normal" : "nowrap",
                      overflow: "hidden",
                      textOverflow: isLongText ? "clip" : "ellipsis",
                      lineHeight: isLongText ? "1.2" : "1",
                    }}
                  >
                    {isLongText ? (
                      <>
                        <span>10시간</span>
                        <span>이상</span>
                      </>
                    ) : (
                      option.label
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 저장하기 버튼 */}
          <button
            onClick={handleSave}
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
            {loading ? "저장 중..." : "저장하기"}
          </button>
        </div>
      </main>

      <Navbar />
    </div>
  );
}

