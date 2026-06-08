import { LAYOUT } from "../constants.js";

export default function FinishButton({
  onClick,
  disabled = false,
  label = "테스팅 마치기",
  showFooterBackground = true,
}) {
  return (
    <div
      className="tablet-action-footer"
      style={{
        position: "absolute",
        left: 0,
        bottom: 0,
        zIndex: 100,
        width: "100%",
        height: `var(--tablet-footer-height, ${LAYOUT.footerHeight}px)`,
        background: showFooterBackground ? "#ffffff" : "transparent",
        pointerEvents: "none",
      }}
    >
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        className="finish-button"
        style={{
          position: "absolute",
          left: "50%",
          top: `var(--finish-button-top, ${LAYOUT.finishButtonTop}px)`,
          width: "var(--finish-button-width, 350px)",
          height: "var(--finish-button-height, 55px)",
          transform: "translateX(-50%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: 0,
          borderRadius: 50,
          background: "#101010",
          color: "#ffffff",
          fontFamily: "Pretendard, sans-serif",
          fontSize: "var(--finish-button-font-size, 20px)",
          fontWeight: 600,
          lineHeight: 1.4,
          pointerEvents: "auto",
          touchAction: "manipulation",
          opacity: disabled ? 0.5 : 1,
        }}
      >
        {label}
      </button>
    </div>
  );
}
