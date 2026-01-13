// pages/ProfileManage.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import PersonalHeader from "../components/PersonalHeader.jsx";
import CharacterDisplay from "../components/CharacterDisplay.jsx";
import { getMyCharacter, getMyUsername, updateUsername } from "../services/api.js";
import { getMyEquippedItems } from "../services/store.js";
import { getMyEquippedBadges } from "../services/badge.js";
import { useUserStore } from "../store/userStore.js";
import { AUTH_USER_KEY, AUTH_TOKEN_KEY } from "../config.js";
import settingIcon from "../assets/navvar/button_setting.png";

const DEBUG_PROFILE_SAVE = true;

function pickImageUrl(item) {
  return item?.imgUrl ?? item?.imageUrl ?? null;
}

export default function ProfileManage() {
  const navigate = useNavigate();
  const { itemMetadata, fetchItemMetadata } = useUserStore();

  const [user, setUser] = useState(null);
  const [nickname, setNickname] = useState("");
  const [originalNickname, setOriginalNickname] = useState("");
  const [characterImageUrl, setCharacterImageUrl] = useState(null);
  const [equippedItems, setEquippedItems] = useState([]);
  const [equippedBadges, setEquippedBadges] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      if (!token) {
        return;
      }

      // 닉네임 로드
      try {
        const usernameData = await getMyUsername();
        if (usernameData && usernameData.username) {
          setNickname(usernameData.username);
          setOriginalNickname(usernameData.username);
        }
      } catch (error) {
        console.error("닉네임 로드 실패:", error);
        // 실패 시 localStorage에서 가져오기
        const userData = localStorage.getItem(AUTH_USER_KEY);
        if (userData) {
          try {
            const parsedUser = JSON.parse(userData);
            const fallbackName = parsedUser.username || parsedUser.name || "";
            setNickname(fallbackName);
            setOriginalNickname(fallbackName);
          } catch (e) {
            console.error("사용자 정보 파싱 실패:", e);
          }
        }
      }

      // 캐릭터 기본 이미지 로드
      try {
        const data = await getMyCharacter();
        if (data && data.imageUrl) {
          setCharacterImageUrl(data.imageUrl);
        }
      } catch (error) {
        console.error("캐릭터 이미지 로드 실패:", error);
      }

      // ✅ 장착 아이템 로드
      try {
        const items = await getMyEquippedItems();
        const itemList = Array.isArray(items) ? items : [];
        setEquippedItems(itemList.filter((item) => item?.equipped !== false));
        fetchItemMetadata(); // 메타데이터 로드
      } catch (error) {
        console.error("장착 아이템 로드 실패:", error);
      }

      // ✅ 장착 뱃지 로드
      try {
        const badges = await getMyEquippedBadges();
        const badgeList = Array.isArray(badges) ? badges : badges ? [badges] : [];
        setEquippedBadges(badgeList.filter((badge) => badge?.equipped !== false));
      } catch (error) {
        console.error("장착 뱃지 로드 실패:", error);
      }
    };

    loadData();
  }, [fetchItemMetadata]);

  // ✅ 메타데이터 적용된 아이템 리스트 생성
  const mergedItems = useMemo(() => {
    return equippedItems.map(item => {
      const id = item.itemId || item.id;
      const meta = itemMetadata?.[id] || {};
      return { ...meta, ...item };
    });
  }, [equippedItems, itemMetadata]);

  // ✅ FACE 아이템을 base로 사용
  const baseCharacterImg = useMemo(() => {
    const face = mergedItems.find(it => it.type === "FACE" || it.uiCategory === "face");
    return pickImageUrl(face) || characterImageUrl || null;
  }, [mergedItems, characterImageUrl]);

  const handleSave = async () => {
    const normalized = nickname.trim();
    if (!normalized) {
      alert("닉네임을 입력해주세요.");
      return;
    }
    if (/\s/.test(normalized)) {
      alert("닉네임에 공백은 사용할 수 없습니다.");
      return;
    }
    if (normalized === originalNickname.trim()) {
      alert("변경된 닉네임이 없습니다.");
      return;
    }

    setLoading(true);
    try {
      // 닉네임 업데이트 API 호출
      await updateUsername(normalized);

      // localStorage 업데이트
      const userData = localStorage.getItem(AUTH_USER_KEY);
      if (userData) {
        try {
          const parsedUser = JSON.parse(userData);
          const updatedUser = { ...parsedUser, username: normalized };
          localStorage.setItem(AUTH_USER_KEY, JSON.stringify(updatedUser));
        } catch (e) {
          console.error("사용자 정보 업데이트 실패:", e);
        }
      }

      navigate("/mypage");
    } catch (error) {
      if (DEBUG_PROFILE_SAVE) {
        console.error("프로필 저장 실패:", {
          status: error?.status,
          data: error?.data,
          message: error?.message,
          nickname: normalized,
          hasToken: Boolean(localStorage.getItem(AUTH_TOKEN_KEY)),
        });
      } else {
        console.error("프로필 저장 실패:", error);
      }
      if (error?.status === 400) {
        const serverMessage = error?.data?.message;
        alert(serverMessage || "닉네임이 중복이거나 규칙에 맞지 않습니다.");
      } else {
        alert("프로필 저장에 실패했습니다.");
      }
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
            alignItems: "center",
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
                color: "#0A7C88",
                margin: 0,
                fontFamily: "var(--font-sans)",
              }}
            >
              프로필 관리
            </h2>
          </div>

          {/* ✅ 캐릭터 아바타 - CharacterDisplay 사용 */}
          <div
            style={{
              width: "120px",
              height: "120px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginTop: "16px",
              overflow: "visible",
            }}
          >
            <CharacterDisplay
              base={baseCharacterImg}
              items={mergedItems}
              badges={equippedBadges}
              style={{
                width: "114px",
                height: "126px",
                transform: "scale(0.95)",
                transformOrigin: "center center",
              }}
            />
          </div>

          {/* 닉네임 입력 */}
          <div
            style={{
              width: "100%",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <label
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: "#111827",
                fontFamily: "var(--font-sans)",
              }}
            >
              닉네임
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="닉네임을 입력하세요"
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

          {/* 저장하기 버튼 */}
          <button
            onClick={handleSave}
            disabled={loading}
            style={{
              width: "100%",
              background: loading ? "#9ca3af" : "#0A7C88",
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
