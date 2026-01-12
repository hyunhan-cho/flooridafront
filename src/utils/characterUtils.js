// src/utils/characterUtils.js

// 숫자 변환 유틸
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

// 서버 데이터(raw) 혹은 메타(meta)를 기반으로 CSS 스타일 객체 생성
export const buildLayerStyleFromServer = (raw, meta = {}) => {
    const pick = (...vals) => {
        for (const v of vals) {
            if (v !== undefined && v !== null && v !== "") return v;
        }
        return null;
    };

    // offset X
    const xRaw = pick(
        raw?.offsetX, raw?.offset_x, raw?.x, raw?.posX, raw?.left,
        meta?.offsetX, meta?.offset_x, meta?.x, meta?.posX, meta?.left
    );

    // offset Y
    const yRaw = pick(
        raw?.offsetY, raw?.offset_y, raw?.y, raw?.posY, raw?.top,
        meta?.offsetY, meta?.offset_y, meta?.y, meta?.posY, meta?.top
    );

    // width / height
    const wRaw = pick(raw?.width, raw?.itemWidth, raw?.w, meta?.width);
    const hRaw = pick(raw?.height, raw?.itemHeight, raw?.h, meta?.height);

    // scale
    const sRaw = pick(raw?.scale, raw?.size, meta?.scale, meta?.size);

    const x = toNum(xRaw);
    const y = toNum(yRaw);
    const w = toNum(wRaw);
    const h = toNum(hRaw);
    const s = toNum(sRaw) ?? 1;

    const style = { position: "absolute" };

    if (x !== null) style.left = `${x}px`;
    if (y !== null) style.top = `${y}px`;
    if (w !== null) style.width = `${w * s}px`;
    if (h !== null) style.height = `${h * s}px`;

    // 기본적으로 픽셀 아트 스타일링 (선명하게)
    style.imageRendering = "pixelated";

    return style;
};

// 다양한 키값에서 이미지 URL 추출
export const pickImgUrl = (obj) => {
    if (!obj) return null;
    const v =
        obj.imgUrl ??
        obj.imageUrl ??
        obj.img_url ??
        obj.image_url ??
        obj.url ??
        obj.image ??
        obj.src ??
        null;

    return typeof v === "string" && v.trim() ? v.trim() : null;
};
