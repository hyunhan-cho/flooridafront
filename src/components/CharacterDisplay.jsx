// src/components/CharacterDisplay.jsx
import React from "react";
import { buildLayerStyleFromServer, pickImgUrl } from "../utils/characterUtils";
import "./CharacterDisplay.css";
import baseChar from "../assets/ch/cha_1.png";

/**
 * 캐릭터(베이스 + 아이템 + 뱃지)를 레이어링하여 보여주는 컴포넌트
 * @param {string} base - 기본 캐릭터 이미지 URL
 * @param {Array} items - 장착 아이템 배열 (imgUrl, offsetX 등 포함)
 * @param {Array} badges - 장착 뱃지 배열 (imgUrl, offsetX 등 포함)
 */
export default function CharacterDisplay({
    base,
    items = [],
    badges = [],
    className = "",
    style = {},
}) {
    // FACE 아이템 찾기
    const faceItem = items.find(
        (it) => it.type === "FACE" || it.uiCategory === "face"
    );

    // 베이스 이미지: FACE 아이템(우선) -> props로 받은 base -> 기본 캐릭터
    const baseImg = pickImgUrl(faceItem) || base || baseChar;

    // FACE가 아닌 아이템들 (액세서리)
    const accessoryItems = items.filter(
        (it) => it.type !== "FACE" && it.uiCategory !== "face"
    );

    return (
        <div className={`character-display-container ${className}`} style={style}>
            {/* 1. 베이스 캐릭터 */}
            {baseImg && (
                <img
                    src={baseImg}
                    alt="character base"
                    className="character-layer-base"
                    style={{ zIndex: 0 }}
                />
            )}

            {/* 2. 액세서리 아이템 */}
            {accessoryItems.map((item, idx) => {
                const src = pickImgUrl(item);
                if (!src) return null;

                const layerStyle = buildLayerStyleFromServer(item);

                return (
                    <img
                        key={`item-${item.id || item.itemId || idx}`}
                        src={src}
                        alt={item.name || "item"}
                        className="character-layer-item"
                        style={{ ...layerStyle, zIndex: 2 + idx }}
                        onLoad={(e) => { e.currentTarget.dataset.ready = "true"; }}
                        onError={(e) => { e.currentTarget.style.display = "none"; }}
                    />
                );
            })}

            {/* 3. 뱃지 */}
            {badges.map((badge, idx) => {
                const src = pickImgUrl(badge);
                if (!src) return null;

                const layerStyle = buildLayerStyleFromServer(badge);
                return (
                    <img
                        key={`badge-${badge.id || badge.badgeId || idx}`}
                        src={src}
                        alt={badge.name || "badge"}
                        className="character-layer-item"
                        style={{ ...layerStyle, zIndex: 10 + idx }}
                        onLoad={(e) => { e.currentTarget.dataset.ready = "true"; }}
                        onError={(e) => { e.currentTarget.style.display = "none"; }}
                    />
                );
            })}
        </div>
    );
}
