import { useState } from "react";

const logoSrc = "/data/images/logo_tb.png";

export default function TestingFinishModal({
  open,
  onConfirm,
  onCancel,
  isSubmitting = false,
  errorMessage = "",
}) {
  const [pressedAction, setPressedAction] = useState(null);

  if (!open) {
    return null;
  }

  const getActionClassName = (action) =>
    ["finish-modal-action", pressedAction === action ? "is-pressed" : ""]
      .filter(Boolean)
      .join(" ");

  const getPressHandlers = (action) => ({
    onPointerDown: () => setPressedAction(action),
    onPointerUp: () => setPressedAction(null),
    onPointerLeave: () => setPressedAction(null),
    onPointerCancel: () => setPressedAction(null),
  });

  return (
    <div
      className="finish-modal-backdrop"
      aria-modal="true"
      role="dialog"
      aria-label="테스트 종료 확인"
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(16, 16, 16, 0.25)",
      }}
    >
      <div
        className="finish-modal-card"
        style={{
          position: "relative",
          width: "var(--finish-modal-size, 420px)",
          height: "var(--finish-modal-size, 420px)",
          borderRadius: "var(--finish-modal-radius, 38px)",
          overflow: "hidden",
          background: "rgba(255, 255, 255, 0.7)",
          boxShadow: "0 10px 50px rgba(0, 0, 0, 0.3)",
          backdropFilter: "blur(100px)",
          WebkitBackdropFilter: "blur(100px)",
          isolation: "isolate",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "inherit",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "inherit",
              background: "rgba(255, 255, 255, 0.25)",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "inherit",
              background: "rgba(255, 255, 255, 0.6)",
            }}
          />
        </div>

        <img
          src={logoSrc}
          alt="NOIR"
          draggable={false}
          style={{
            position: "absolute",
            zIndex: 1,
            top: "9.5%",
            left: "50%",
            width: "var(--finish-modal-logo-size, 60px)",
            height: "var(--finish-modal-logo-size, 60px)",
            objectFit: "contain",
            transform: "translateX(-50%)",
          }}
        />

        <div
          style={{
            position: "absolute",
            zIndex: 1,
            left: "50%",
            top: "38.6%",
            transform: "translateX(-50%)",
            width: "86%",
            color: "#3f3f3f",
            fontFamily: "Pretendard, sans-serif",
            fontSize: "var(--finish-modal-font-size, 20px)",
            fontWeight: 400,
            lineHeight: 1.2,
            textAlign: "center",
            whiteSpace: "nowrap",
          }}
        >
          <p style={{ margin: 0 }}>테스팅을 마치고</p>
          <p style={{ margin: 0 }}>컬러 프로필과 제품 정보를 확인합니다.</p>
        </div>

        <div
          style={{
            position: "absolute",
            zIndex: 1,
            left: "50%",
            top: "68.8%",
            width: "90.5%",
            display: "flex",
            flexDirection: "column",
            gap: "var(--finish-modal-action-gap, 10px)",
            transform: "translateX(-50%)",
          }}
        >
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className={getActionClassName("confirm")}
            {...getPressHandlers("confirm")}
            style={{
              height: "var(--finish-modal-action-height, 40px)",
              width: "100%",
              border: "1px solid #fafafa",
              borderRadius: 999,
              background: "#ffffff",
              color: "#ab0d00",
              fontFamily: "Pretendard, sans-serif",
              fontSize: "var(--finish-modal-font-size, 20px)",
              fontWeight: 500,
              lineHeight: 1.4,
              textAlign: "center",
              touchAction: "manipulation",
              opacity: isSubmitting ? 0.72 : 1,
            }}
          >
            {isSubmitting ? "결과를 정리하고 있어요.." : "네 마칠게요"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className={getActionClassName("cancel")}
            {...getPressHandlers("cancel")}
            style={{
              height: "var(--finish-modal-action-height, 40px)",
              width: "100%",
              border: "1px solid #fafafa",
              borderRadius: 999,
              background: "#ffffff",
              color: "#3f3f3f",
              fontFamily: "Pretendard, sans-serif",
              fontSize: "var(--finish-modal-font-size, 20px)",
              fontWeight: 500,
              lineHeight: 1.4,
              textAlign: "center",
              touchAction: "manipulation",
              opacity: isSubmitting ? 0.5 : 1,
            }}
          >
            돌아가기
          </button>
          {errorMessage ? (
            <p
              style={{
                margin: "2px 0 0",
                color: "#ab0d00",
                fontFamily: "Pretendard, sans-serif",
                fontSize: "var(--finish-modal-error-font-size, 13px)",
                fontWeight: 500,
                lineHeight: 1.3,
                textAlign: "center",
              }}
            >
              {errorMessage}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
