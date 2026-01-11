import React, { useEffect } from "react";
// 주의: src/assets/coin.png 파일이 존재해야 합니다.
import coinImg from "../assets/coin.png";

export default function CoinPopup({ onClose, coinAmount = 10 }) {
  // ✅ CSS를 이 파일에 합치기 (한 번만 주입)
  useEffect(() => {
    const styleId = "coin-popup-styles";
    if (document.getElementById(styleId)) return;

    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      .popup-overlay {
        position: fixed;
        inset: 0;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        animation: fadeIn 0.2s ease-out;
      }

      .popup-box {
        background: #ffffff;
        width: 300px;
        padding: 24px 20px;
        border-radius: 12px;
        text-align: center;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 20px;
        animation: popup-pop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      }

      .popup-title {
        color: #111827;
        margin: 0;
        font-size: 18px;
        font-weight: 800;
      }

      .popup-content {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        font-size: 24px;
        font-weight: 800;
        color: #111827;
      }

      .coin-img {
        width: 40px;
        height: 40px;
        object-fit: contain;
        filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.2));
      }

      .popup-confirm-btn {
        width: 100%;
        padding: 12px;
        background-color: #e5e7eb;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 700;
        color: #374151;
        cursor: pointer;
        transition: background 0.2s;
      }

      .popup-confirm-btn:hover {
        background-color: #d1d5db;
      }

      @keyframes popup-pop {
        from {
          transform: scale(0.9);
          opacity: 0;
        }
        to {
          transform: scale(1);
          opacity: 1;
        }
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);
  }, []);

  return (
    <div className="popup-overlay">
      <div className="popup-box">
        <h3 className="popup-title">코인을 획득했습니다!</h3>

        <div className="popup-content">
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
