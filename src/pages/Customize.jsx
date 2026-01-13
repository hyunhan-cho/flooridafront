import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import coinIcon from "../assets/coin.png";
import paintIcon from "../assets/paint.png";
import "./Customize.css";
import "../components/CoinPopup.css"; // ✅ Import shared popup styles

// ✅ API 서비스
import { getMyProfile } from "../services/profile.js";
import {
  getStoreItems,
  purchaseItem,
  equipItem,
  unequipItem,
  getMyItems,
  getMyEquippedItems,
} from "../services/store.js";
import { getMyCharacter } from "../services/character.js";
import {
  getMyBadgesSummary,
  getMyEquippedBadges,
  equipBadge,
  unequipBadge,
} from "../services/badge.js";

// ✅ Zustand 전역 상태
import { useUserStore } from "../store/userStore.js";

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
  const [savePopupOpen, setSavePopupOpen] = useState(false); // ✅ 저장 완료 팝업

  const [previewItems, setPreviewItems] = useState({
    face: null,
    item: null,
  });

  const [previewStyles, setPreviewStyles] = useState({
    face: {},
    item: {},
  });

  const [equippedBadges, setEquippedBadges] = useState([]);

  const [catalogMetaById, setCatalogMetaById] = useState({
    face: {},
    item: {},
  });

  const [baseCharacterUrl, setBaseCharacterUrl] = useState(null);

  // -------------------------
  // 3) 유틸 함수들
  // -------------------------
  const tabToServerType = (tab) => (tab === "face" ? "FACE" : "ACCESSORY");

  const inferUiCategory = (raw) => {
    if (raw?.type === "FACE") return "face";
    if (raw?.type === "ACCESSORY") return "item";
    return "item";
  };

  const pickImgUrl = (obj) => {
    const v =
      obj?.imgUrl ??
      obj?.imageUrl ??
      obj?.img_url ??
      obj?.image_url ??
      obj?.url ??
      obj?.image ??
      null;
    return typeof v === "string" && v.trim() ? v.trim() : null;
  };

  const resolveImageSrc = (uiCategory, fileName, imgUrl) => {
    if (imgUrl && typeof imgUrl === "string") {
      const u = imgUrl.trim();
      if (u.startsWith("http") || u.startsWith("/")) return u;
      if (!u.includes(".")) fileName = u;
      else return u;
    }
    if (typeof fileName === "string") {
      const k = fileName.trim();
      if (k.startsWith("http") || k.startsWith("/")) return k;
    }
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
    // 기본 face fallback
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
    } catch { }
  };

  // =========================
  // --- 데이터 로딩 useEffect들 ---
  // =========================

  const {
    profile: cachedProfile,
    character: cachedCharacter,
    fetchProfile,
    fetchCharacter,
  } = useUserStore();

  useEffect(() => {
    (async () => {
      // 캐시된 캐릭터 우선 사용
      if (cachedCharacter) {
        setBaseCharacterUrl(cachedCharacter);
      } else {
        const url = await fetchCharacter();
        if (url) setBaseCharacterUrl(url);
      }

      // 캐시된 프로필 우선 사용
      if (cachedProfile?.coin !== undefined) {
        setUserCoins(Number(cachedProfile.coin));
      } else {
        const profile = await fetchProfile();
        const coin = profile?.coin ?? profile?.points;
        if (coin !== undefined && coin !== null) {
          setUserCoins(Number(coin));
        }
      }

      try {
        const my = await getMyItems();
        const list = Array.isArray(my) ? my : my?.result ?? my?.data ?? [];
        setOwnedSet(new Set(list.map((x) => Number(x.itemId ?? x.id))));
      } catch { }
    })();
  }, [cachedProfile, cachedCharacter, fetchProfile, fetchCharacter]);

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

        accList.forEach((it) => {
          const id = Number(it.itemId ?? it.id);
          if (!Number.isNaN(id)) itemMeta[id] = it;
        });

        setCatalogMetaById({ face: faceMeta, item: itemMeta });
      } catch { }
    })();
  }, []);

  const refreshEquipped = async () => {
    try {
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

      const normalizedBadges = (badgeList ?? [])
        .map((b) => {
          const id = Number(b.badgeId ?? b.badge_id ?? b.id);
          if (Number.isNaN(id)) return null;

          newSet.add(`badge:${id}`);
          const imgUrl = pickImgUrl(b);
          const style = buildLayerStyleFromServer(b, b);

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
    } catch { }
  };

  useEffect(() => {
    refreshEquipped();
  }, []);

  useEffect(() => {
    if (
      (catalogMetaById?.item && Object.keys(catalogMetaById.item).length > 0) ||
      (catalogMetaById?.face && Object.keys(catalogMetaById.face).length > 0)
    ) {
      refreshEquipped();
    }
  }, [catalogMetaById]);

  useEffect(() => {
    (async () => {
      // 뱃지 탭
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
                imgUrl: pickImgUrl(b),
              };
            })
            .filter(Boolean);

          setStoreItems(normalized);
        } catch {
          setStoreItems([]);
        }
        return;
      }

      // face / item 탭
      try {
        const raw = await getStoreItems(tabToServerType(activeTab));
        const list = Array.isArray(raw) ? raw : raw?.result ?? raw?.data ?? [];

        const mapped = list
          .map((item) => {
            const cat = inferUiCategory(item);
            const id = Number(item.itemId ?? item.id);
            if (Number.isNaN(id)) return null;

            const fileName = String(id);
            const imgUrl = pickImgUrl(item);

            return {
              id,
              name: item.name ?? "",
              uiCategory: cat,
              price: item.price ?? 0,
              owned: item.owned ?? ownedSet.has(id),
              equipped: equippedSet.has(`${cat}:${id}`),
              imgUrl,
              fileName,
              isBasicFace: cat === "face" && (item.name?.toLowerCase() === "basic" || item.name === "기본"),
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
      setSavePopupOpen(true); // ✅ 팝업 오픈
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

    if (selectedItem.isBasicFace) {
      try {
        const equippedFaceKey = [...equippedSet].find(key => key.startsWith("face:"));
        if (equippedFaceKey) {
          const faceId = Number(equippedFaceKey.split(":")[1]);
          if (!isNaN(faceId)) {
            await unequipItem(faceId);
            await refreshEquipped();
            alert("기본 캐릭터로 변경되었습니다!");
          }
        } else {
          alert("이미 기본 캐릭터입니다.");
        }
        closePopup();
        return;
      } catch {
        alert("변경 실패");
        return;
      }
    }

    try {
      if (selectedItem.uiCategory === "badge") {
        await equipBadge(selectedItem.id);
      } else {
        await equipItem(selectedItem.id);
      }
      await refreshEquipped();
      alert("장착 완료!");
      closePopup();
    } catch (e) {
      if (e?.status === 409) {
        // [Auto-Swap] 배지 슬롯이 꽉 찼을 때 자동 교체 제안
        if (selectedItem.uiCategory === "badge" && equippedBadges.length > 0) {
          const toRemove = equippedBadges[0]; // 첫 번째 배지를 교체 대상으로 선정
          const removeName = toRemove.name || toRemove.title || "기존 배지";

          if (window.confirm(`뱃지 장착 슬롯이 가득 찼습니다.\n'${removeName}'을(를) 해제하고 장착하시겠습니까?`)) {
            try {
              const rmId = toRemove.badgeId ?? toRemove.id;
              await unequipBadge(rmId);
              await equipBadge(selectedItem.id);
              await refreshEquipped();
              alert("교체 완료!");
              closePopup();
              return;
            } catch (retryErr) {
              alert("교체 실패: " + (retryErr?.message || "다시 시도해주세요."));
              return;
            }
          }
        }
        alert("이미 장착 중이거나, 장착 가능한 최대 개수를 초과했습니다.");
      } else {
        alert(e?.message || "장착 실패");
      }
    }
  };

  const handleUnequip = async () => {
    if (!selectedItem) return;
    if (selectedItem.isBasicFace) {
      alert("기본 캐릭터는 해제할 수 없습니다.");
      closePopup();
      return;
    }
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

  // -------------------------
  // 6) JSX 렌더링
  // -------------------------
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
          {(() => {
            const baseSrc = getPreviewSource("face") || baseCharacterUrl;
            return (
              baseSrc && (
                <img
                  src={baseSrc}
                  className="cust-layer-img"
                  style={{ ...previewStyles.face, zIndex: 0 }}
                  alt="base"
                  onLoad={(e) => { e.currentTarget.dataset.ready = "true"; }}
                  onError={(e) => (e.currentTarget.style.display = "none")}
                />
              )
            );
          })()}

          {getPreviewSource("item") && (() => {
            let itemStyle = previewStyles.item;
            if (selectedItem && selectedItem.uiCategory === "item") {
              const meta = catalogMetaById?.item?.[selectedItem.id];
              itemStyle = buildLayerStyleFromServer(selectedItem, meta);
            }
            const hasPosition = itemStyle?.top || itemStyle?.left;
            return (
              <img
                src={getPreviewSource("item")}
                className="cust-layer-img"
                style={{ ...itemStyle, zIndex: 2 }}
                alt="item"
                onLoad={(e) => {
                  if (hasPosition) e.currentTarget.dataset.ready = "true";
                }}
                data-ready={hasPosition ? "true" : "false"}
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
            );
          })()}

          {equippedBadges.map((b, idx) => (
            <img
              key={`badge-${b.id}`}
              src={resolveImageSrc("badge", String(b.id), b.imgUrl)}
              className="cust-layer-img"
              style={{ ...b.style, zIndex: 3 + idx }}
              alt="badge"
              onLoad={(e) => {
                if (b.style?.top || b.style?.left) {
                  e.currentTarget.dataset.ready = "true";
                }
              }}
              data-ready={
                (b.style?.top || b.style?.left) ? "true" : "false"
              }
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
              className={`cust-price-tag ${item.uiCategory === "badge"
                ? item.owned
                  ? "is-owned"
                  : "is-hidden"
                : item.owned
                  ? "is-owned"
                  : "is-price"
                }`}
            >
              {item.uiCategory === "badge" ? (
                item.owned ? <span className="owned-label">보유</span> : null
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
                alt={selectedItem.name}
              />
            </div>

            {selectedItem.uiCategory !== "badge" && !selectedItem.owned && (
              <div className="cust-modal-price">
                <img src={coinIcon} alt="coin" />
                <span>{selectedItem.price}</span>
              </div>
            )}

            <div className="cust-modal-actions">
              {/* 기본 캐릭터인 경우 '해제 불가' 등 처리 */}
              {selectedItem.isBasicFace ? (
                selectedItem.equipped ? (
                  // 이미 장착중 -> 아무것도 안함 or '현재 장착중' 표시
                  <button className="cust-btn-yes" onClick={closePopup}>확인</button>
                ) : (
                  // 장착 안됨 -> 변경 가능
                  <>
                    <button className="cust-btn-yes" onClick={handleEquip}>변경</button>
                    <button className="cust-btn-no" onClick={closePopup}>취소</button>
                  </>
                )
              ) : selectedItem.owned ? (
                selectedItem.equipped ? (
                  <>
                    <button className="cust-btn-no" onClick={handleUnequip}>
                      해제
                    </button>
                    <button className="cust-btn-yes" onClick={closePopup}>
                      닫기
                    </button>
                  </>
                ) : (
                  <>
                    <button className="cust-btn-yes" onClick={handleEquip}>
                      장착
                    </button>
                    <button className="cust-btn-no" onClick={closePopup}>
                      닫기
                    </button>
                  </>
                )
              ) : (
                <>
                  <button className="cust-btn-yes" onClick={handlePurchase}>
                    구매
                  </button>
                  <button className="cust-btn-no" onClick={closePopup}>
                    취소
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <Navbar />

      {/* ✅ 저장 완료 팝업 (CoinPopup 스타일) */}
      {savePopupOpen && (
        <div className="popup-overlay">
          <div className="popup-box">
            <h3 className="popup-title">저장 완료!</h3>
            <div className="popup-content" style={{ flexDirection: "column", gap: "10px" }}>
              <img
                src={paintIcon}
                alt="저장"
                className="coin-img"
                style={{ width: "50px", height: "50px" }}
              />
              <span style={{ fontSize: "16px", fontWeight: "700", wordBreak: "keep-all" }}>
                현재 장착 상태로 저장되었습니다!
              </span>
            </div>
            <button
              className="popup-confirm-btn"
              onClick={() => setSavePopupOpen(false)}
            >
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customize;
