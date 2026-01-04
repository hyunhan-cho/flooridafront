import React, { useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import coinIcon from "../assets/coin.png";
import "./Customize.css";

// API 서비스
import { getMyProfile } from "../services/profile.js";
import {
  getStoreItems,
  purchaseItem,
  equipItem,
  unequipItem,
  getMyItems,
  getMyEquippedItems,
} from "../services/store.js";
import { http } from "../services/api.js";

// ✅ 이미지를 직접 임포트하여 엑박 방지
import cha_1 from "../assets/ch/cha_1.png";
import cha_2 from "../assets/ch/cha_2.png";
import cha_3 from "../assets/ch/cha_3.png";
import cha_4 from "../assets/ch/cha_4.png";
import cha_5 from "../assets/ch/cha_5.png";

import cat from "../assets/item/cat.png";
import crown from "../assets/item/crown.png";
import horn from "../assets/item/horn.png";
import poop from "../assets/item/poop.png";
import ribbon from "../assets/item/ribbon.png";
import sprout from "../assets/item/sprout.png";

import badge_1 from "../assets/badge/1.png";
import badge_10 from "../assets/badge/10.png";
import badge_30 from "../assets/badge/30.png";
import badge_50 from "../assets/badge/50.png";
import badge_star from "../assets/badge/star.png";

const LOCAL_IMAGES = {
  face: {
    cha_1: cha_1,
    cha_2: cha_2,
    cha_3: cha_3,
    cha_4: cha_4,
    cha_5: cha_5,
    1: cha_1,
    2: cha_2,
    3: cha_3,
    4: cha_4,
    5: cha_5,
  },
  item: {
    cat: cat,
    crown: crown,
    horn: horn,
    poop: poop,
    ribbon: ribbon,
    sprout: sprout,
    10: cat,
    11: crown,
    12: horn,
    13: poop,
    14: ribbon,
    15: sprout,
  },
  badge: {
    1: badge_1,
    10: badge_10,
    30: badge_30,
    50: badge_50,
    star: badge_star,
    100: badge_1,
    101: badge_10,
    102: badge_30,
    103: badge_50,
    104: badge_star,
  },
};

const Customize = () => {
  const [userCoins, setUserCoins] = useState(0);
  const [activeTab, setActiveTab] = useState("face");
  const [selectedItem, setSelectedItem] = useState(null);

  const [storeItems, setStoreItems] = useState([]);
  const [ownedSet, setOwnedSet] = useState(new Set());
  const [equippedSet, setEquippedSet] = useState(new Set());
  const [previewItems, setPreviewItems] = useState({
    face: "cha_1",
    item: null,
  });
  const [ownedBadgeKeySet, setOwnedBadgeKeySet] = useState(new Set());

  const categoryMapping = useMemo(
    () => ({
      face: {
        1: "cha_1",
        2: "cha_2",
        3: "cha_3",
        4: "cha_4",
        5: "cha_5",
        기본: "cha_1",
        웃음: "cha_2",
        화남: "cha_3",
        슬픔: "cha_4",
        히든: "cha_5",
      },
      item: {
        10: "cat",
        11: "crown",
        12: "horn",
        13: "poop",
        14: "ribbon",
        15: "sprout",
        cat: "cat",
        crown: "crown",
        horn: "horn",
        poop: "poop",
        ribbon: "ribbon",
        sprout: "sprout",
      },
      badge: {
        100: "1",
        101: "10",
        102: "30",
        103: "50",
        104: "star",
        star: "star",
      },
    }),
    []
  );

  const tabToServerType = (tab) => (tab === "face" ? "FACE" : "ACCESSORY");

  const inferUiCategory = (raw) => {
    if (raw.type === "FACE") return "face";
    if (raw.type === "ACCESSORY") {
      const id = Number(raw.itemId ?? raw.id);
      if (!Number.isNaN(id) && id >= 100) return "badge";
      return "item";
    }
    return "item";
  };

  const resolveImageSrc = (uiCategory, fileName, imgUrl) => {
    if (imgUrl && typeof imgUrl === "string") {
      if (imgUrl.startsWith("http") || imgUrl.startsWith("/")) return imgUrl;
      if (!imgUrl.includes(".")) fileName = imgUrl;
      else return imgUrl;
    }
    if (!fileName) return "";
    const categoryImages = LOCAL_IMAGES[uiCategory];
    if (categoryImages && categoryImages[fileName]) {
      return categoryImages[fileName];
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
    if (category === "face") return resolveImageSrc("face", "cha_1");
    return null;
  };

  // --- 데이터 로딩 ---

  // ✅ [수정] 코인 로직 복구 및 강화
  useEffect(() => {
    (async () => {
      try {
        const profile = await getMyProfile();
        // 응답 구조가 다양할 수 있으므로 안전하게 체이닝하여 코인 값을 찾음
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

      // 보유 아이템 로드
      try {
        const my = await getMyItems();
        const list = Array.isArray(my) ? my : my?.result ?? my?.data ?? [];
        setOwnedSet(new Set(list.map((x) => Number(x.itemId ?? x.id))));
      } catch {}
    })();
  }, []);

  // 장착 아이템 로드
  const refreshEquipped = async () => {
    try {
      const eq = await getMyEquippedItems();
      const list = Array.isArray(eq) ? eq : eq?.result ?? eq?.data ?? [];

      const newSet = new Set();
      const newPreview = { ...previewItems };

      list.forEach((item) => {
        const cat = inferUiCategory(item);
        const id = Number(item.itemId ?? item.id);

        newSet.add(`${cat}:${id}`);

        const map = categoryMapping[cat] || {};
        const fileName = map[id] || map[item.name] || String(id);
        newPreview[cat] = fileName;
      });

      setEquippedSet(newSet);
      setPreviewItems(newPreview);
    } catch {}
  };

  useEffect(() => {
    refreshEquipped();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const raw = await http.get("/api/me/badges");
        const list = Array.isArray(raw) ? raw : raw?.data ?? raw?.result ?? [];
        setOwnedBadgeKeySet(
          new Set(list.map((b) => String(b.badgeId ?? b.id)))
        );
      } catch {}
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (activeTab === "badge") {
        const badgeCatalog = [
          { id: 100, fileName: "1", name: "1층" },
          { id: 101, fileName: "10", name: "10층" },
          { id: 102, fileName: "30", name: "30층" },
          { id: 103, fileName: "50", name: "50층" },
          { id: 104, fileName: "star", name: "스타" },
        ];
        setStoreItems(
          badgeCatalog.map((b) => ({
            ...b,
            uiCategory: "badge",
            price: 0,
            owned: ownedBadgeKeySet.has(b.fileName),
            equipped: equippedSet.has(`badge:${b.id}`),
          }))
        );
        return;
      }

      try {
        const raw = await getStoreItems(tabToServerType(activeTab));
        const list = Array.isArray(raw) ? raw : raw?.result ?? raw?.data ?? [];

        const mapped = list
          .map((item) => {
            const cat = inferUiCategory(item);
            if (cat === "badge") return null;

            const id = Number(item.itemId ?? item.id);
            const map = categoryMapping[cat] || {};
            const fileName = map[id] || map[item.name] || String(id);

            return {
              id,
              name: item.name ?? "",
              uiCategory: cat,
              price: item.price ?? 0,
              owned: item.owned ?? ownedSet.has(id),
              equipped: equippedSet.has(`${cat}:${id}`),
              imgUrl: item.imgUrl,
              fileName,
            };
          })
          .filter(Boolean)
          .filter((x) => x.uiCategory === activeTab);

        setStoreItems(mapped);
        setSelectedItem(null);
      } catch (e) {
        setStoreItems([]);
      }
    })();
  }, [activeTab, ownedSet, equippedSet, ownedBadgeKeySet, categoryMapping]);

  const handleTabClick = (tab) => {
    setActiveTab(tab);
    setSelectedItem(null);
  };
  const handleItemClick = (item) => setSelectedItem(item);
  const closePopup = () => setSelectedItem(null);

  const handlePurchase = async () => {
    if (!selectedItem) return;
    if (userCoins < selectedItem.price) {
      alert("코인이 부족합니다.");
      return;
    }
    try {
      await purchaseItem(selectedItem.id);

      // ✅ [수정] 코인 차감 로직 안전하게
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
      await equipItem(selectedItem.id);

      setEquippedSet((prev) => {
        const next = new Set(prev);
        for (const k of next) {
          if (k.startsWith(`${selectedItem.uiCategory}:`)) next.delete(k);
        }
        next.add(`${selectedItem.uiCategory}:${selectedItem.id}`);
        return next;
      });

      setPreviewItems((prev) => ({
        ...prev,
        [selectedItem.uiCategory]: selectedItem.fileName,
      }));

      alert("장착 완료!");
      closePopup();
    } catch {
      alert("장착 실패");
    }
  };

  const handleUnequip = async () => {
    if (!selectedItem) return;
    try {
      await unequipItem(selectedItem.id);

      setEquippedSet((prev) => {
        const next = new Set(prev);
        next.delete(`${selectedItem.uiCategory}:${selectedItem.id}`);
        return next;
      });

      setPreviewItems((prev) => ({
        ...prev,
        [selectedItem.uiCategory]: null,
      }));

      alert("해제 완료!");
      closePopup();
    } catch {
      alert("해제 실패");
    }
  };

  return (
    <div className="customize-page-container">
      <header className="cust-header-row">
        <h2 className="cust-page-title">캐릭터 꾸미기</h2>
        <div className="cust-coin-badge">
          <img src={coinIcon} alt="coin" />
          <span>{Number(userCoins).toLocaleString()}</span>
        </div>
      </header>

      <section className="cust-preview-area">
        <div className="cust-character-stage">
          {getPreviewSource("face") && (
            <img
              src={getPreviewSource("face")}
              className="cust-layer-img"
              style={{ zIndex: 1 }}
              alt="face"
            />
          )}
          {getPreviewSource("item") && (
            <img
              src={getPreviewSource("item")}
              className="cust-layer-img"
              style={{ zIndex: 2 }}
              alt="item"
            />
          )}
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
                onError={(e) => (e.target.style.display = "none")}
              />
            </div>
            <div className="cust-price-tag">
              {item.uiCategory !== "badge" && (
                <>
                  <img src={coinIcon} alt="c" />
                  <span>{item.price}</span>
                </>
              )}
              {item.owned && <span className="status-badge owned">V</span>}
              {item.equipped && <span className="status-badge equip">E</span>}
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
              />
            </div>
            <div className="cust-modal-price">
              {selectedItem.uiCategory === "badge" ? (
                <span style={{ fontWeight: "bold" }}>
                  {selectedItem.owned ? "보유함" : "미보유"}
                </span>
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
