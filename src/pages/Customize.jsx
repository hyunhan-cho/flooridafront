import React, { useEffect, useState } from "react";
/**
 * React 핵심 훅들
 * - useState: 컴포넌트 내부 상태(state) 저장/갱신
 * - useEffect: 특정 시점(마운트/업데이트)에 부수효과(API 호출, 이벤트 등록 등) 실행
 */

import Navbar from "../components/Navbar";
/**
 * 하단 네비게이션 바(탭/메뉴 등) 컴포넌트
 * Customize 화면의 하단 공통 UI를 유지하기 위해 포함
 */

import coinIcon from "../assets/coin.png";
/**
 * 코인 UI에 표시할 이미지(코인 아이콘)
 */

import paintIcon from "../assets/paint.png"; // ✅ [추가] 페인트 아이콘
/**
 * 화면 헤더에 표시할 ‘커스터마이징’ 느낌의 페인트 아이콘
 */

import "./Customize.css";
/**
 * 이 페이지에서 사용하는 스타일 시트
 * - 프리뷰 영역(캐릭터 캔버스)
 * - 상점 그리드
 * - 모달(팝업)
 * - 탭 버튼 등
 */

// =========================
// ✅ API 서비스(백엔드 연동 함수)
// =========================
import { getMyProfile } from "../services/profile.js";
/**
 * 유저 프로필 조회 API 래퍼 함수
 * - 코인(coin/points) 등 유저 정보 가져오는 용도
 */

import {
  getStoreItems,
  purchaseItem,
  equipItem,
  unequipItem,
  getMyItems,
  getMyEquippedItems,
} from "../services/store.js";
/**
 * 상점/아이템 관련 API 래퍼 함수 모음
 * - getStoreItems(type): 상점 카탈로그 조회(FACE / ACCESSORY)
 * - purchaseItem(itemId): 아이템 구매
 * - equipItem(itemId): 아이템 장착
 * - unequipItem(itemId): 아이템 해제
 * - getMyItems(): 내가 보유한 아이템 리스트 조회
 * - getMyEquippedItems(): 내가 현재 장착 중인 아이템 리스트 조회
 */

// ✅✅✅ 캐릭터 API는 character.js로 분리
import { getMyCharacter } from "../services/character.js";

// ✅✅✅ 뱃지 API는 badge.js에서 관리
import {
  getMyBadgesSummary,
  getMyEquippedBadges,
  equipBadge,
  unequipBadge,
} from "../services/badge.js";

// =========================
// ✅ 메인 페이지 컴포넌트
// =========================
const Customize = () => {
  // -------------------------
  // 1) 화면/유저 상태(state)
  // -------------------------
  const [userCoins, setUserCoins] = useState(0);
  const [activeTab, setActiveTab] = useState("face");
  const [selectedItem, setSelectedItem] = useState(null);
  const [storeItems, setStoreItems] = useState([]);
  const [ownedSet, setOwnedSet] = useState(new Set());
  const [equippedSet, setEquippedSet] = useState(new Set());

  const [previewItems, setPreviewItems] = useState({
    face: null,
    item: null,
  });

  // ✅ 프리뷰에 적용할 style 저장
  const [previewStyles, setPreviewStyles] = useState({
    face: {},
    item: {},
  });

  // ✅✅✅ [추가] 장착된 뱃지 레이어(여러 개여도 대응)
  const [equippedBadges, setEquippedBadges] = useState([]);

  // ✅ 카탈로그(상점 목록)에서 itemId -> (offsetX/width/height...) 메타 매핑
  const [catalogMetaById, setCatalogMetaById] = useState({
    face: {},
    item: {},
  });

  // ✅✅✅ 서버 “완성 캐릭터(얼굴 포함)” 베이스 이미지 URL
  const [baseCharacterUrl, setBaseCharacterUrl] = useState(null);

  // -------------------------
  // 3) 유틸 함수들(규칙/파싱/이미지 결정)
  // -------------------------
  const tabToServerType = (tab) => (tab === "face" ? "FACE" : "ACCESSORY");

  // ✅ 확정: ACCESSORY에는 아이템만 / FACE는 face만
  const inferUiCategory = (raw) => {
    if (raw?.type === "FACE") return "face";
    if (raw?.type === "ACCESSORY") return "item";
    return "item";
  };

  // ✅ 스웨거 확정 키 반영 + CSV/구버전 대응
  // - 아이템: imgUrl (swagger) / img_url (csv)
  // - 뱃지: imageUrl (swagger) / image_url (csv)
  const pickImgUrl = (obj) => {
    const v =
      obj?.imgUrl ?? // items swagger
      obj?.imageUrl ?? // badges swagger
      obj?.img_url ?? // item_rows.csv
      obj?.image_url ?? // badges_rows.csv
      obj?.url ??
      obj?.image ??
      null;

    return typeof v === "string" && v.trim() ? v.trim() : null;
  };

  const resolveImageSrc = (uiCategory, fileName, imgUrl) => {
    // 1) 서버 URL이 있으면 최우선 사용
    if (imgUrl && typeof imgUrl === "string") {
      const u = imgUrl.trim();
      if (u.startsWith("http") || u.startsWith("/")) return u;

      if (!u.includes(".")) fileName = u;
      else return u;
    }

    // 2) fileName이 URL 자체면 그대로 사용
    if (typeof fileName === "string") {
      const k = fileName.trim();
      if (k.startsWith("http") || k.startsWith("/")) return k;
    }

    // 3) 서버 카탈로그 메타에서 id로 imgUrl 찾아보기(얼굴/아이템만)
    const n = Number(fileName);
    if (!Number.isNaN(n)) {
      if (uiCategory === "face") {
        const meta = catalogMetaById?.face?.[n];
        const url = pickImgUrl(meta);
        if (url) return url;
      }
      if (uiCategory === "item") {
        const meta = catalogMetaById?.item?.[n];
        const url = pickImgUrl(meta);
        if (url) return url;
      }
    }

    // ✅ 하드코딩 제거: 로컬 fallback 없음
    return "";
  };

  const getPreviewSource = (category) => {
    if (selectedItem && selectedItem.uiCategory === category) {
      return resolveImageSrc(
        category,
        selectedItem.fileName,
        selectedItem.imgUrl
      );
    }
    const savedFileName = previewItems[category];
    if (savedFileName) {
      return resolveImageSrc(category, savedFileName);
    }

    // ✅ 하드코딩 제거: 기본 face는 "서버 FACE 카탈로그 첫 항목"
    if (category === "face") {
      const keys = Object.keys(catalogMetaById?.face ?? {});
      const firstId = keys.length ? keys[0] : null;
      return firstId ? resolveImageSrc("face", firstId) : null;
    }

    return null;
  };

  const toNum = (v) => {
    if (v === undefined || v === null) return null;
    if (typeof v === "number") return Number.isFinite(v) ? v : null;
    if (typeof v === "string") {
      const t = v.trim();
      if (!t) return null;
      const n = parseFloat(t.replace(/,/g, ""));
      return Number.isFinite(n) ? n : null;
    }
    return null;
  };

  const buildLayerStyleFromServer = (raw, meta) => {
    const pick = (...vals) => {
      for (const v of vals) {
        if (v !== undefined && v !== null && v !== "") return v;
      }
      return null;
    };

    // ✅ 스웨거: offsetX/offsetY, CSV: offset_x/offset_y 둘 다 대응
    const xRaw = pick(
      raw?.offsetX,
      raw?.offset_x,
      raw?.x,
      raw?.posX,
      raw?.left,
      meta?.offsetX,
      meta?.offset_x,
      meta?.x,
      meta?.posX,
      meta?.left
    );

    const yRaw = pick(
      raw?.offsetY,
      raw?.offset_y,
      raw?.y,
      raw?.posY,
      raw?.top,
      meta?.offsetY,
      meta?.offset_y,
      meta?.y,
      meta?.posY,
      meta?.top
    );

    // ✅ 스웨거: width/height, CSV도 width/height
    const wRaw = pick(raw?.width, raw?.itemWidth, raw?.w, meta?.width);
    const hRaw = pick(raw?.height, raw?.itemHeight, raw?.h, meta?.height);

    const sRaw = pick(raw?.scale, raw?.size, meta?.scale, meta?.size);

    const x = toNum(xRaw);
    const y = toNum(yRaw);
    const w = toNum(wRaw);
    const h = toNum(hRaw);

    const sNum = toNum(sRaw);
    const scale = sNum == null ? null : sNum > 10 ? sNum / 100 : sNum;

    const style = {};

    if (x != null) style.left = `${x}px`;
    if (y != null) style.top = `${y}px`;

    const looksLikeRatio = (n) => n != null && n > 0 && n <= 3;

    if (w != null && !looksLikeRatio(w)) style.width = `${w}px`;
    if (h != null && !looksLikeRatio(h)) style.height = `${h}px`;

    if (
      (w == null || h == null || looksLikeRatio(w) || looksLikeRatio(h)) &&
      scale != null &&
      scale !== 1
    ) {
      style.transform = `scale(${scale})`;
      style.transformOrigin = "top left";
    }

    return style;
  };

  const syncCoinsFromServer = async () => {
    try {
      const profile = await getMyProfile();
      const coin =
        profile?.coin ??
        profile?.data?.coin ??
        profile?.points ??
        profile?.data?.points;

      if (coin !== undefined && coin !== null) {
        setUserCoins(Number(coin));
      }
    } catch {}
  };

  // =========================
  // --- 데이터 로딩 useEffect들 ---
  // =========================

  useEffect(() => {
    (async () => {
      // ✅✅✅ 서버 완성 캐릭터(얼굴 포함) 베이스 이미지 조회
      try {
        const res = await getMyCharacter();
        const url =
          res?.imageUrl ?? res?.data?.imageUrl ?? res?.result?.imageUrl;
        if (url) setBaseCharacterUrl(url);
      } catch (e) {
        console.warn("캐릭터 베이스 로드 실패:", e);
      }

      try {
        const profile = await getMyProfile();
        const coin =
          profile?.coin ??
          profile?.data?.coin ??
          profile?.points ??
          profile?.data?.points;

        if (coin !== undefined && coin !== null) {
          setUserCoins(Number(coin));
        }
      } catch (e) {
        console.warn("프로필 로드 실패:", e);
      }

      try {
        const my = await getMyItems();
        const list = Array.isArray(my) ? my : my?.result ?? my?.data ?? [];
        setOwnedSet(new Set(list.map((x) => Number(x.itemId ?? x.id))));
      } catch {}
    })();
  }, []);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        syncCoinsFromServer();
      }
    };
    const onFocus = () => {
      syncCoinsFromServer();
    };

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [rawFace, rawAcc] = await Promise.all([
          getStoreItems("FACE"),
          getStoreItems("ACCESSORY"),
        ]);

        const faceList = Array.isArray(rawFace)
          ? rawFace
          : rawFace?.result ?? rawFace?.data ?? [];
        const accList = Array.isArray(rawAcc)
          ? rawAcc
          : rawAcc?.result ?? rawAcc?.data ?? [];

        const faceMeta = {};
        const itemMeta = {};

        faceList.forEach((it) => {
          const id = Number(it.itemId ?? it.id);
          if (!Number.isNaN(id)) faceMeta[id] = it;
        });

        // ✅ ACCESSORY는 item만
        accList.forEach((it) => {
          const id = Number(it.itemId ?? it.id);
          if (!Number.isNaN(id)) itemMeta[id] = it;
        });

        setCatalogMetaById({ face: faceMeta, item: itemMeta });
      } catch {}
    })();
  }, []);

  const refreshEquipped = async () => {
    try {
      // ✅✅✅ 아이템/얼굴 장착 + 뱃지 장착을 동시에 가져옴
      const [eq, badgeEqRaw] = await Promise.all([
        getMyEquippedItems(),
        getMyEquippedBadges().catch(() => null),
      ]);

      const list = Array.isArray(eq) ? eq : eq?.result ?? eq?.data ?? [];

      const badgeList = Array.isArray(badgeEqRaw)
        ? badgeEqRaw
        : badgeEqRaw?.result ?? badgeEqRaw?.data ?? [];

      const newSet = new Set();
      const newPreview = { face: null, item: null };
      const newStyles = { face: {}, item: {} };

      // ✅ 아이템/얼굴 장착 (아이템은 1개만 가능해도 프론트는 "현재 장착된 것"만 보여줌)
      list.forEach((it) => {
        const cat = inferUiCategory(it);
        const id = Number(it.itemId ?? it.id);
        if (Number.isNaN(id)) return;

        newSet.add(`${cat}:${id}`);

        if (cat === "face") newPreview.face = String(id);
        if (cat === "item") newPreview.item = String(id);

        if (cat === "item") {
          const meta = catalogMetaById?.item?.[id];
          newStyles.item = buildLayerStyleFromServer(it, meta);
        }
      });

      // ✅✅✅ 뱃지 장착: “보이게” 하려면 이미지+좌표를 상태로 들고 있어야 함
      const normalizedBadges = (badgeList ?? [])
        .map((b) => {
          const id = Number(b.badgeId ?? b.badge_id ?? b.id);
          if (Number.isNaN(id)) return null;

          newSet.add(`badge:${id}`);

          const imgUrl = pickImgUrl(b); // swagger: imageUrl
          const style = buildLayerStyleFromServer(b, b); // badge 응답에 offsetX/width/height 포함

          return {
            id,
            imgUrl,
            style,
          };
        })
        .filter(Boolean);

      setEquippedBadges(normalizedBadges);

      setEquippedSet(newSet);
      setPreviewItems((prev) => ({ ...prev, ...newPreview }));
      setPreviewStyles((prev) => ({ ...prev, ...newStyles }));
    } catch {}
  };

  useEffect(() => {
    refreshEquipped();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (
      (catalogMetaById?.item && Object.keys(catalogMetaById.item).length > 0) ||
      (catalogMetaById?.face && Object.keys(catalogMetaById.face).length > 0)
    ) {
      refreshEquipped();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogMetaById]);

  useEffect(() => {
    (async () => {
      // ✅ 뱃지 탭: 미보유 제외 OK → summary(보유 목록)만 사용
      if (activeTab === "badge") {
        try {
          const raw = await getMyBadgesSummary();
          const list =
            raw?.badges ?? raw?.data?.badges ?? raw?.result?.badges ?? [];

          const normalized = (list ?? [])
            .map((b) => {
              const id = Number(b.badgeId ?? b.badge_id ?? b.id);
              if (Number.isNaN(id)) return null;

              return {
                id,
                fileName: String(id),
                name: b.name ?? "",
                description: b.description ?? "",
                uiCategory: "badge",
                price: 0,
                owned: true,
                equipped: equippedSet.has(`badge:${id}`),
                imgUrl: pickImgUrl(b), // ✅ swagger: imageUrl
              };
            })
            .filter(Boolean);

          setStoreItems(normalized);
        } catch {
          setStoreItems([]);
        }
        return;
      }

      // ✅ face/item 탭: /api/items?type=FACE|ACCESSORY
      try {
        const raw = await getStoreItems(tabToServerType(activeTab));
        const list = Array.isArray(raw) ? raw : raw?.result ?? raw?.data ?? [];

        const mapped = list
          .map((item) => {
            const cat = inferUiCategory(item); // face or item
            const id = Number(item.itemId ?? item.id);
            if (Number.isNaN(id)) return null;

            const fileName = String(id);
            const imgUrl = pickImgUrl(item); // ✅ swagger: imgUrl

            return {
              id,
              name: item.name ?? "",
              uiCategory: cat,
              price: item.price ?? 0,
              owned: item.owned ?? ownedSet.has(id),
              equipped: equippedSet.has(`${cat}:${id}`),
              imgUrl,
              fileName,
            };
          })
          .filter(Boolean)
          .filter((x) => x.uiCategory === activeTab);

        setStoreItems(mapped);
        setSelectedItem(null);
      } catch {
        setStoreItems([]);
      }
    })();
  }, [activeTab, ownedSet, equippedSet]);

  // -------------------------
  // 5) UI 이벤트 핸들러들
  // -------------------------
  const handleTabClick = (tab) => {
    setActiveTab(tab);
    setSelectedItem(null);
  };

  const handleItemClick = (item) => setSelectedItem(item);
  const closePopup = () => setSelectedItem(null);

  const handleSaveNow = async () => {
    try {
      await refreshEquipped();
      alert("현재 장착 상태로 저장되었습니다!");
    } catch {
      alert("저장 상태 확인 실패");
    }
  };

  const handlePurchase = async () => {
    if (!selectedItem) return;

    if (userCoins < selectedItem.price) {
      alert("코인이 부족합니다.");
      return;
    }

    try {
      await purchaseItem(selectedItem.id);

      setUserCoins((prev) => {
        const next = prev - selectedItem.price;
        return next < 0 ? 0 : next;
      });

      setOwnedSet((prev) => new Set(prev).add(selectedItem.id));

      alert("구매 완료!");
      closePopup();
    } catch {
      alert("구매 실패");
    }
  };

  const handleEquip = async () => {
    if (!selectedItem) return;
    try {
      if (selectedItem.uiCategory === "badge") {
        await equipBadge(selectedItem.id);
      } else {
        await equipItem(selectedItem.id);
      }

      await refreshEquipped();
      alert("장착 완료!");
      closePopup();
    } catch {
      alert("장착 실패");
    }
  };

  const handleUnequip = async () => {
    if (!selectedItem) return;
    try {
      if (selectedItem.uiCategory === "badge") {
        await unequipBadge(selectedItem.id);
      } else {
        await unequipItem(selectedItem.id);
      }

      await refreshEquipped();
      alert("해제 완료!");
      closePopup();
    } catch {
      alert("해제 실패");
    }
  };

  // =========================
  // 6) JSX 렌더링(화면 구조)
  // =========================
  return (
    <div className="customize-page-container">
      <header className="cust-header-row">
        <img className="cust-paint-icon" src={paintIcon} alt="paint" />
        <h2 className="cust-page-title">캐릭터 꾸미기</h2>

        <div className="cust-coin-badge">
          <img src={coinIcon} alt="coin" />
          <span>{Number(userCoins).toLocaleString()}</span>
        </div>
      </header>

      <section className="cust-preview-area">
        <button className="cust-save-btn" onClick={handleSaveNow}>
          이대로 저장
        </button>

        <div className="cust-character-stage">
          {/* ✅✅✅ [수정] face(=몸통 포함 베이스)를 최우선으로 그리고, 없으면 baseCharacterUrl로 fallback */}
          {(() => {
            const baseSrc = getPreviewSource("face") || baseCharacterUrl;
            return (
              baseSrc && (
                <img
                  src={baseSrc}
                  className="cust-layer-img"
                  style={{ ...previewStyles.face, zIndex: 0 }}
                  alt="base"
                  onError={(e) => (e.currentTarget.style.display = "none")}
                />
              )
            );
          })()}

          {/* 아이템(액세서리) 레이어 */}
          {getPreviewSource("item") && (
            <img
              src={getPreviewSource("item")}
              className="cust-layer-img"
              style={{ ...previewStyles.item, zIndex: 2 }}
              alt="item"
              onError={(e) => (e.currentTarget.style.display = "none")}
            />
          )}

          {/* ✅✅✅ 뱃지 레이어: 아이템과 “동시에” 가능 */}
          {equippedBadges.map((b, idx) => (
            <img
              key={`badge-${b.id}`}
              src={resolveImageSrc("badge", String(b.id), b.imgUrl)}
              className="cust-layer-img"
              style={{ ...b.style, zIndex: 3 + idx }}
              alt="badge"
              onError={(e) => (e.currentTarget.style.display = "none")}
            />
          ))}
        </div>
      </section>

      <nav className="cust-tab-menu">
        {["face", "item", "badge"].map((tab) => (
          <button
            key={tab}
            className={`cust-tab-btn ${activeTab === tab ? "active" : ""}`}
            onClick={() => handleTabClick(tab)}
          >
            {tab === "face" ? "얼굴" : tab === "item" ? "아이템" : "뱃지"}
          </button>
        ))}
      </nav>

      <section className="cust-item-grid">
        {storeItems.map((item) => (
          <div
            key={item.id}
            className="cust-item-card"
            onClick={() => handleItemClick(item)}
          >
            <div className="cust-img-wrapper">
              <img
                src={resolveImageSrc(
                  item.uiCategory,
                  item.fileName,
                  item.imgUrl
                )}
                alt={item.name}
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
            </div>

            <div
              className={`cust-price-tag ${
                item.uiCategory === "badge"
                  ? item.owned
                    ? "is-owned"
                    : "is-hidden"
                  : item.owned
                  ? "is-owned"
                  : "is-price"
              }`}
            >
              {item.uiCategory === "badge" ? (
                item.owned ? (
                  <span className="owned-label">보유</span>
                ) : null
              ) : item.owned ? (
                <span className="owned-label">보유</span>
              ) : (
                <>
                  <img className="price-coin" src={coinIcon} alt="coin" />
                  <span className="price-num">{item.price}</span>
                </>
              )}
            </div>
          </div>
        ))}
      </section>

      {selectedItem && (
        <div className="cust-modal-overlay">
          <div className="cust-modal-box">
            <h3 className="cust-modal-title">{selectedItem.name}</h3>

            <div className="cust-modal-img">
              <img
                src={resolveImageSrc(
                  selectedItem.uiCategory,
                  selectedItem.fileName,
                  selectedItem.imgUrl
                )}
                alt="preview"
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
            </div>

            <div className="cust-modal-price">
              {selectedItem.uiCategory === "badge" ? (
                <span style={{ fontWeight: "bold" }}>보유함</span>
              ) : (
                <>
                  <img src={coinIcon} alt="coin" />
                  <span>{selectedItem.price}</span>
                </>
              )}
            </div>

            <div className="cust-modal-actions">
              {selectedItem.owned ? (
                selectedItem.equipped ? (
                  <button className="cust-btn-yes" onClick={handleUnequip}>
                    해제
                  </button>
                ) : (
                  <button className="cust-btn-yes" onClick={handleEquip}>
                    장착
                  </button>
                )
              ) : (
                <button className="cust-btn-yes" onClick={handlePurchase}>
                  구매
                </button>
              )}

              <button className="cust-btn-no" onClick={closePopup}>
                X
              </button>
            </div>
          </div>
        </div>
      )}

      <Navbar />
    </div>
  );
};

export default Customize;
