import React from "react";
import "./BadgePopup.css";

export default function BadgePopup({ onClose, badge }) {
  if (!badge) return null;

  const { name, description, imageUrl } = badge;

  return (
    <div className="badge-popup-overlay">
      <div className="badge-popup-box">
        <h3 className="badge-popup-title">뱃지를 획득했습니다!</h3>

        <div className="badge-popup-content">
          <img
            src={imageUrl}
            alt="뱃지"
            className="badge-img"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
          <div className="badge-text">
            <div className="badge-name">{name}</div>
            <div className="badge-desc">{description}</div>
          </div>
        </div>

        <button className="badge-popup-confirm-btn" onClick={onClose}>
          확인
        </button>
      </div>
    </div>
  );
}
