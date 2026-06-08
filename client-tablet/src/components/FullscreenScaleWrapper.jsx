import { useStageScale } from "../hooks/useTabletHooks.js";
import { DESIGN_WIDTH, LAYOUT } from "../constants.js";

export default function FullscreenScaleWrapper({
  children,
  overlay = null,
  stageHeight = LAYOUT.footerTop,
  reservedFooterHeight = LAYOUT.footerHeight,
}) {
  const { scale, stageStyle, viewportStyle } = useStageScale({
    stageHeight,
    reservedFooterHeight,
  });

  return (
    <div className="tablet-viewport" style={viewportStyle}>
      <div
        className="tablet-stage"
        style={{
          width: DESIGN_WIDTH,
          height: stageHeight,
          transformOrigin: "top left",
          transform: `scale(${scale})`,
          ...stageStyle,
        }}
      >
        {children}
      </div>
      {overlay}
    </div>
  );
}
