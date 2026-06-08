import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { DESIGN_HEIGHT, DESIGN_WIDTH, LAYOUT } from "../constants.js";
import { isSocketEnabled } from "../utils/devConfig.js";
import { getSocketConnectOptions } from "../utils/serverConfig.js";

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function readSafeAreaInsets() {
  const styles = getComputedStyle(document.documentElement);
  const read = (name) => Number.parseFloat(styles.getPropertyValue(name)) || 0;

  return {
    top: read("--safe-top"),
    right: read("--safe-right"),
    bottom: read("--safe-bottom"),
    left: read("--safe-left"),
  };
}

export function useStageScale({
  stageHeight = LAYOUT.footerTop,
  reservedFooterHeight = LAYOUT.footerHeight,
} = {}) {
  const [metrics, setMetrics] = useState({
    scale: 1,
    stageStyle: {},
    viewportStyle: {},
  });

  useEffect(() => {
    const updateScale = () => {
      const safe = readSafeAreaInsets();
      const viewportWidth = window.innerWidth - safe.left - safe.right;
      const viewportHeight = window.innerHeight - safe.top - safe.bottom;
      const hasFooter = reservedFooterHeight > 0;
      const footerHeight = hasFooter
        ? clamp(viewportHeight * 0.13, 88, reservedFooterHeight)
        : 0;
      const stageViewportHeight = Math.max(viewportHeight - footerHeight, 1);

      const widthScale = viewportWidth / DESIGN_WIDTH;
      const heightScale = stageViewportHeight / stageHeight;
      const coverScale = Math.max(widthScale, heightScale);
      const scale = Math.min(coverScale, widthScale * 1.04);
      const left = safe.left + (viewportWidth - DESIGN_WIDTH * scale) / 2;
      const buttonHeight = hasFooter ? clamp(footerHeight * 0.4, 42, 55) : 0;
      const buttonTop = hasFooter
        ? Math.max((footerHeight - buttonHeight) / 2 - 10, 0)
        : 0;
      const buttonWidth = hasFooter ? clamp(viewportWidth * 0.32, 280, 350) : 0;
      const buttonFontSize = hasFooter ? clamp(buttonHeight * 0.36, 16, 20) : 0;
      const modalScale = clamp(
        Math.min(viewportWidth / DESIGN_WIDTH, viewportHeight / DESIGN_HEIGHT),
        0.78,
        1.16,
      );
      const modalSize = 420 * modalScale;

      setMetrics({
        scale,
        stageStyle: {
          left,
          top: safe.top,
        },
        viewportStyle: {
          "--tablet-footer-height": `${footerHeight}px`,
          "--finish-button-top": `${buttonTop}px`,
          "--finish-button-width": `${buttonWidth}px`,
          "--finish-button-height": `${buttonHeight}px`,
          "--finish-button-font-size": `${buttonFontSize}px`,
          "--finish-modal-size": `${modalSize}px`,
          "--finish-modal-radius": `${38 * modalScale}px`,
          "--finish-modal-logo-size": `${60 * modalScale}px`,
          "--finish-modal-font-size": `${20 * modalScale}px`,
          "--finish-modal-action-height": `${40 * modalScale}px`,
          "--finish-modal-action-gap": `${10 * modalScale}px`,
          "--finish-modal-error-font-size": `${13 * modalScale}px`,
        },
      });
    };

    updateScale();
    window.addEventListener("resize", updateScale);
    window.visualViewport?.addEventListener("resize", updateScale);

    return () => {
      window.removeEventListener("resize", updateScale);
      window.visualViewport?.removeEventListener("resize", updateScale);
    };
  }, [reservedFooterHeight, stageHeight]);

  return metrics;
}

/** @deprecated useStageScale */
export function useScale() {
  const { scale } = useStageScale();
  return scale;
}

export function createTabletSocket() {
  if (!isSocketEnabled()) {
    return null;
  }

  const { url, options } = getSocketConnectOptions();
  return io(url, options);
}
