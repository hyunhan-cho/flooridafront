import React from "react";

/**
 * 범용 경고/확인 모달
 * @param {boolean} open - 표시 여부
 * @param {string} title - 제목 (기본: 경고)
 * @param {React.ReactNode} content - 내용 (줄바꿈 등 포함 가능)
 * @param {function} onConfirm - 확인 버튼 핸들러
 * @param {function} onClose - 닫기/취소 버튼 핸들러
 * @param {string} confirmText - 확인 버튼 텍스트 (기본: 확인)
 * @param {string} cancelText - 취소 버튼 텍스트 (기본: 취소)
 * @param {string} confirmColor - 확인 버튼 색상 (기본: #d32f2f)
 */
export default function WarningModal({
    open,
    title = "경고",
    content,
    onConfirm,
    onClose,
    confirmText = "확인",
    cancelText = "취소",
    confirmColor = "#d32f2f",
}) {
    if (!open) return null;

    return (
        <div className="popup-overlay" style={{ zIndex: 9999 }}>
            <div className="popup-box">
                <h3 className="popup-title" style={{ color: confirmColor }}>
                    {title}
                </h3>
                <div
                    className="popup-content"
                    style={{ flexDirection: "column", gap: "10px", textAlign: "center" }}
                >
                    <span
                        style={{
                            fontSize: "16px",
                            fontWeight: "700",
                            wordBreak: "keep-all",
                            lineHeight: 1.4,
                        }}
                    >
                        {content}
                    </span>
                </div>
                <div
                    style={{
                        display: "flex",
                        gap: "10px",
                        marginTop: "10px",
                        width: "100%",
                        justifyContent: "center",
                    }}
                >
                    <button
                        className="popup-confirm-btn"
                        onClick={onConfirm}
                        style={{ background: confirmColor, flex: 1 }}
                    >
                        {confirmText}
                    </button>
                    <button
                        className="popup-confirm-btn"
                        onClick={onClose}
                        style={{ background: "#aaa", flex: 1 }}
                    >
                        {cancelText}
                    </button>
                </div>
            </div>
        </div>
    );
}
