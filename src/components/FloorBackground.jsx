import React, { useEffect, useState } from "react";
import backgroundImg from "../assets/img/image 20.png"; // 1-10층용 배경
import bgSkyImg from "../assets/img/bg_sky.png"; // 11-249층용 배경
import bgMoonImg from "../assets/img/bg_moon.png"; // 250-499층용 배경
import bgAuroraImg from "../assets/img/bg_aurora.png"; // 500-749층용 배경
import bgSpaceImg from "../assets/img/bg_space.png"; // 750층 이상용 배경

const FLOOR_STEP_PX = 55;
const BG_SPACE_MAX_POSITION = 1100;

function getLoopedBottom({
  level,
  startFloor,
  stepPx,
  maxPosition,
  baseOffset,
  extraOffset = 0,
}) {
  const movePx = (level - startFloor) * stepPx;
  if (!Number.isFinite(maxPosition) || maxPosition <= 0) {
    return baseOffset - movePx + extraOffset;
  }
  const cycleHeight = maxPosition + stepPx;
  const modRaw = ((movePx % cycleHeight) + cycleHeight) % cycleHeight;
  const modPx = modRaw > maxPosition ? 0 : modRaw;
  return baseOffset - modPx + extraOffset;
}

function loadImageHeight(src, setter) {
  const img = new Image();
  img.src = src;
  img.onload = () => setter(img.naturalHeight);
}

export default function FloorBackground({ personalLevel }) {
  const [bgSkyImageHeight, setBgSkyImageHeight] = useState(0);
  const [bgMoonImageHeight, setBgMoonImageHeight] = useState(0);
  const [bgAuroraImageHeight, setBgAuroraImageHeight] = useState(0);
  const [bgSpaceImageHeight, setBgSpaceImageHeight] = useState(0);

  useEffect(() => {
    loadImageHeight(bgSkyImg, setBgSkyImageHeight);
    loadImageHeight(bgMoonImg, setBgMoonImageHeight);
    loadImageHeight(bgAuroraImg, setBgAuroraImageHeight);
    loadImageHeight(bgSpaceImg, setBgSpaceImageHeight);
  }, []);

  if (personalLevel >= 1 && personalLevel <= 10) {
    return (
      <img
        src={backgroundImg}
        alt="배경"
        className="floor-background-img"
        style={{
          // 1층: bottom: 45px, 10층: bottom: -60px
          bottom: `${45 - (personalLevel - 1) * (105 / 9)}px`,
          transform: "translateX(-50%) scale(0.85)",
          transition: "bottom 0.5s ease-in-out 1.3s",
        }}
      />
    );
  }

  if (personalLevel >= 11 && personalLevel <= 249) {
    return (
      <img
        src={bgSkyImg}
        alt="배경"
        className="floor-background-img"
        style={{
          bottom: `${getLoopedBottom({
            level: personalLevel,
            startFloor: 11,
            stepPx: FLOOR_STEP_PX,
            maxPosition:
              bgSkyImageHeight > 0 ? bgSkyImageHeight - FLOOR_STEP_PX : 0,
            baseOffset: -60,
          })}px`,
          transform: "translateX(-50%) scale(0.85)",
          transition: "bottom 0.5s ease-in-out 1.3s",
          objectPosition: "bottom center",
        }}
        onLoad={(e) => {
          const img = e.target;
          if (bgSkyImageHeight === 0 && img.naturalHeight > 0) {
            setBgSkyImageHeight(img.naturalHeight);
          }
        }}
      />
    );
  }

  if (personalLevel >= 250 && personalLevel <= 499) {
    return (
      <img
        src={bgMoonImg}
        alt="배경"
        className="floor-background-img"
        style={{
          bottom: `${getLoopedBottom({
            level: personalLevel,
            startFloor: 250,
            stepPx: FLOOR_STEP_PX,
            maxPosition:
              bgMoonImageHeight > 0 ? bgMoonImageHeight - FLOOR_STEP_PX : 0,
            baseOffset: -60,
          })}px`,
          transform: "translateX(-50%) scale(0.85)",
          transition: "bottom 0.5s ease-in-out 1.3s",
          objectPosition: "bottom center",
        }}
        onLoad={(e) => {
          const img = e.target;
          if (bgMoonImageHeight === 0 && img.naturalHeight > 0) {
            setBgMoonImageHeight(img.naturalHeight);
          }
        }}
      />
    );
  }

  if (personalLevel >= 500 && personalLevel <= 749) {
    if (bgAuroraImageHeight > 0) {
      const movePx = (personalLevel - 500) * FLOOR_STEP_PX;
      const maxPosition = 1535;
      const cycleHeight = maxPosition + FLOOR_STEP_PX;
      const modRaw = ((movePx % cycleHeight) + cycleHeight) % cycleHeight;
      const modPx = modRaw > maxPosition ? 0 : modRaw;
      const baseOffset = -60;
      const visualOffset = 115;
      const bottomValue = baseOffset - modPx + visualOffset;

      return (
        <img
          src={bgAuroraImg}
          alt="배경"
          className="floor-background-img"
          style={{
            bottom: `${bottomValue}px`,
            transform: "translateX(-50%) scale(0.85)",
            transition: "bottom 0.5s ease-in-out 1.3s",
            objectPosition: "bottom center",
          }}
        />
      );
    }

    const baseOffset = -60;
    const visualOffset = 115;
    const movePx = (personalLevel - 500) * FLOOR_STEP_PX;
    return (
      <img
        src={bgAuroraImg}
        alt="배경"
        className="floor-background-img"
        style={{
          bottom: `${baseOffset - movePx + visualOffset}px`,
          transform: "translateX(-50%) scale(0.85)",
          transition: "bottom 0.5s ease-in-out 1.3s",
          objectPosition: "bottom center",
        }}
      />
    );
  }

  if (personalLevel >= 750) {
    return (
      <img
        src={bgSpaceImg}
        alt="배경"
        className="floor-background-img"
        style={{
          bottom: `${getLoopedBottom({
            level: personalLevel,
            startFloor: 750,
            stepPx: FLOOR_STEP_PX,
            maxPosition: bgSpaceImageHeight > 0 ? BG_SPACE_MAX_POSITION : 0,
            baseOffset: -60,
            extraOffset: -80,
          })}px`,
          transform: "translateX(-50%) scale(0.85)",
          transition: "bottom 0.5s ease-in-out 1.3s",
          objectPosition: "bottom center",
        }}
      />
    );
  }

  return null;
}
