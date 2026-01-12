// src/components/CharacterDisplay.jsx
import React from "react";
import { buildLayerStyleFromServer, pickImgUrl } from "../utils/characterUtils";
import "./CharacterDisplay.css";

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
    return (
        <div className={`character-display-container ${className}`} style={style}>
            {/* 1. 베이스 캐릭터 */}
            {base && (
                <img
                    src={base}
                    alt="character base"
                    className="character-layer-img"
                    style={{ zIndex: 0 }}
                />
            )}

            {/* 2. 아이템 (FACE는 z-index 1, ACCESSORY는 z-index 2) */}
            {items
                .slice()
                .sort((a, b) => {
                    // FACE가 먼저 오도록 정렬
                    const typeA = a.type || a.uiCategory; // 메타데이터에 type 있음
                    const typeB = b.type || b.uiCategory;
                    if (typeA === "FACE" && typeB !== "FACE") return -1;
                    if (typeA !== "FACE" && typeB === "FACE") return 1;
                    return 0;
                })
                .map((item, idx) => {
                    const src = pickImgUrl(item);
                    if (!src) return null;

                    const layerStyle = buildLayerStyleFromServer(item);
                    const isFace = item.type === "FACE" || item.uiCategory === "face";
                    // FACE는 베이스 바로 위(1), 액세서리는 그 위(2)
                    const zIndex = isFace ? 1 : 2;

                    return (
                        <img
                            key={`item-${item.id || idx}`}
                            src={src}
                            alt={item.name || "item"}
                            className="character-layer-img"
                            style={{ ...layerStyle, zIndex }}
                        />
                    );
                })}

            {/* 3. 뱃지 (z-index 3 이상) */}
            {badges.map((badge, idx) => {
                const src = pickImgUrl(badge);
                if (!src) return null;

                const layerStyle = buildLayerStyleFromServer(badge);
                return (
                    <img
                        key={`badge-${badge.id || idx}`}
                        src={src}
                        alt={badge.name || "badge"}
                        className="character-layer-img"
                        style={{ ...layerStyle, zIndex: 3 + idx }}
                    />
                );
            })}
        </div>
    );
}
