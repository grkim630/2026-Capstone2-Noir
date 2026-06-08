import { useEffect, useRef, useState } from "react";
import {
  COLOR_CHIP_GAP,
  COLOR_CHIP_SELECTED_SIZE,
  COLOR_CHIP_SIZE,
  blushIconSrc,
} from "../constants.js";
import { getColorchipImagePath } from "../utils/productUtils.js";

function ColorChipLabel({ displayName, displayID, selected }) {
  const labelGap = selected ? 17.5 : 16;
  const frameOffsetY = selected ? 4 : 3;

  return (
    <div
      className="pointer-events-none absolute left-1/2 top-1/2 flex flex-col items-center text-center text-white"
      style={{
        width: selected ? 46.667 : 42.667,
        gap: labelGap,
        fontSize: selected ? 17.5 : 16,
        lineHeight: 1.4,
        transform: `translate(-50%, calc(-50% + ${frameOffsetY}px))`,
      }}
    >
      <span className="font-bethany uppercase">{displayName}</span>
      <span className="font-pretendard text-[length:inherit] font-bold">{displayID}</span>
    </div>
  );
}

export default function ColorChipButton({
  product,
  target,
  selected = false,
  onSelect,
  disabled = false,
}) {
  const pointerStartRef = useRef(null);
  const [imageLoadFailed, setImageLoadFailed] = useState(false);
  const size = selected ? COLOR_CHIP_SELECTED_SIZE : COLOR_CHIP_SIZE;
  const imageSrc = getColorchipImagePath(product, target);
  const imageKey = `${target}-${product.id}-${product.imageFileName || product.name || ""}`;
  useEffect(() => {
    setImageLoadFailed(false);
  }, [imageKey]);

  const handlePointerDown = (event) => {
    pointerStartRef.current = { x: event.clientX, y: event.clientY };
  };

  const handleClick = (event) => {
    if (disabled) {
      return;
    }

    const start = pointerStartRef.current;
    pointerStartRef.current = null;

    if (start) {
      const deltaX = Math.abs(event.clientX - start.x);
      const deltaY = Math.abs(event.clientY - start.y);
      if (deltaX > 8 || deltaY > 8) {
        return;
      }
    }

    onSelect?.(product);
  };

  return (
    <button
      type="button"
      onPointerDown={handlePointerDown}
      onClick={handleClick}
      disabled={disabled}
      className="relative shrink-0 overflow-visible touch-manipulation"
      style={{
        width: size,
        height: size,
        marginRight: COLOR_CHIP_GAP,
      }}
      aria-pressed={selected}
      aria-label={`${product.displayName} ${product.displayID}`}
    >
      <div
        className={[
          "relative h-full w-full overflow-hidden rounded-[20px]",
          selected ? "border-[8px] border-[#101010]" : "",
        ].join(" ")}
        style={{
          borderRadius: selected ? 21.875 : 20,
        }}
      >
        {imageSrc && !imageLoadFailed ? (
          <img
            src={imageSrc}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            draggable={false}
            onError={() => setImageLoadFailed(true)}
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{ backgroundColor: product.hex }}
            aria-hidden="true"
          />
        )}

        <ColorChipLabel
          displayName={product.displayName}
          displayID={product.displayID}
          selected={selected}
        />
      </div>

      {selected ? (
        <div className="absolute bottom-[-6px] right-[-6px] flex h-[50px] w-[50px] items-center justify-center overflow-hidden rounded-full bg-[#101010]">
          <img
            src={blushIconSrc}
            alt=""
            className="h-[28px] w-[28px] object-contain"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
        </div>
      ) : null}
    </button>
  );
}
