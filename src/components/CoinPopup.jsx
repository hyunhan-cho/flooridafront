import React from "react";
import "./CoinPopup.css";
// 주의: src/assets/coin.png 파일이 존재해야 합니다.
import coinImg from "../assets/coin.png";

export default function CoinPopup({ onClose, coinAmount = 10 }) {
  return (
    <div className="popup-overlay">
      <div className="popup-box">
        <h3 className="popup-title">코인을 획득했습니다!</h3>

        <div className="popup-content">
          {/* 이미지가 없을 경우를 대비해 onError 추가 */}
          <img
            src={coinImg}
            alt="코인"
            className="coin-img"
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
          <span className="coin-amount">+ {coinAmount}</span>
        </div>

        <button className="popup-confirm-btn" onClick={onClose}>
          확인
        </button>
      </div>
    </div>
  );
}
