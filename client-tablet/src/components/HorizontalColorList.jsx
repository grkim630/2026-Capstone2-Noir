import { useEffect, useRef, useState } from "react";
import ColorChipButton from "./ColorChipButton.jsx";
import { isSameSelectedProduct } from "../utils/productUtils.js";

export default function HorizontalColorList({
  products,
  target,
  selectedProduct,
  onSelect,
  scrollLeft,
  onScrollLeftChange,
}) {
  const scrollRef = useRef(null);
  const isDraggingRef = useRef(false);
  const dragStateRef = useRef({ startX: 0, startScrollLeft: 0 });
  const [suppressClick, setSuppressClick] = useState(false);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollLeft;
    }
  }, [scrollLeft, target]);

  const handleScroll = () => {
    if (scrollRef.current) {
      onScrollLeftChange(scrollRef.current.scrollLeft);
    }
  };

  const handlePointerDown = (event) => {
    if (!scrollRef.current) {
      return;
    }

    isDraggingRef.current = true;
    setSuppressClick(false);
    dragStateRef.current = {
      startX: event.clientX,
      startScrollLeft: scrollRef.current.scrollLeft,
    };
    scrollRef.current.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event) => {
    if (!isDraggingRef.current || !scrollRef.current) {
      return;
    }

    const deltaX = event.clientX - dragStateRef.current.startX;
    if (Math.abs(deltaX) > 8) {
      setSuppressClick(true);
    }

    scrollRef.current.scrollLeft = dragStateRef.current.startScrollLeft - deltaX;
  };

  const endDrag = (event) => {
    if (!scrollRef.current) {
      return;
    }

    isDraggingRef.current = false;
    if (scrollRef.current.hasPointerCapture(event.pointerId)) {
      scrollRef.current.releasePointerCapture(event.pointerId);
    }
    handleScroll();

    window.setTimeout(() => {
      setSuppressClick(false);
    }, 0);
  };

  return (
    <div
      ref={scrollRef}
      className="horizontal-color-scroll hide-scrollbar flex w-full overflow-x-auto overflow-y-visible pb-[8px]"
      onScroll={handleScroll}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <div className="flex min-w-max items-center">
        {products.map((product) => (
          <ColorChipButton
            key={`${target}-${product.id}`}
            product={product}
            target={target}
            selected={isSameSelectedProduct(selectedProduct, product, target)}
            onSelect={onSelect}
            disabled={suppressClick}
          />
        ))}
      </div>
    </div>
  );
}
