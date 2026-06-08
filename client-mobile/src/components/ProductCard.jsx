import { linkLogoSrc } from "../utils/assets.js";
import { fluid, lh } from "../utils/fluid.js";

const PRODUCT_IMAGE_SIZE = {
  lip: { width: 130, height: 185 },
  blush: { width: 117, height: 182 },
  eye_palette: { width: 120, height: 120 },
};

/** 402px 기준 — 제품명 텍스트 박스 레이아웃 */
const PILL_LAYOUT = {
  height: 80,
  idCircle: { left: 10, size: 60 },
  nameBox: { width: 123, height: 80, gapFromCircle: 16 },
};

const NAME_BOX_LEFT =
  PILL_LAYOUT.idCircle.left + PILL_LAYOUT.idCircle.size + PILL_LAYOUT.nameBox.gapFromCircle;

function ProductImage({ product, variant }) {
  if (!product?.imageSrc) {
    return null;
  }

  const size = PRODUCT_IMAGE_SIZE[variant] || PRODUCT_IMAGE_SIZE.lip;

  return (
    <div
      className="pointer-events-none absolute"
      style={{
        right:
          variant === "lip" ? fluid(6) : variant === "blush" ? fluid(14) : fluid(30),
        top: variant === "eye_palette" ? fluid(-23) : fluid(-58),
        width: fluid(size.width),
        height: fluid(size.height),
        transform: variant === "eye_palette" ? "none" : "rotate(15deg)",
      }}
    >
      <img
        src={product.imageSrc}
        alt=""
        className={`size-full ${variant === "eye_palette" ? "rounded-full object-cover" : "object-contain"}`}
        onError={(event) => {
          event.currentTarget.style.display = "none";
        }}
      />
    </div>
  );
}

export default function ProductCard({ product, variant }) {
  if (!product) {
    return null;
  }

  const accent = product.hex || "#DA7971";
  const gradient =
    variant === "eye_palette"
      ? `linear-gradient(90deg, ${accent} 0%, #F8D9D8 100%)`
      : `linear-gradient(90deg, ${accent} 20%, #FFFFFF 100%)`;

  return (
    <div className="w-full" style={{ display: "flex", flexDirection: "column", gap: fluid(15) }}>
      <div className="px-[10px]">
        <p
          className="m-0 font-pretendard font-semibold uppercase text-[#101010]"
          style={{ fontSize: fluid(16), lineHeight: lh.body }}
        >
          {product.categoryLabel}
        </p>
      </div>

      <div className="relative w-full" style={{ display: "flex", flexDirection: "column", gap: fluid(30) }}>
        <div
          className="relative w-full overflow-hidden rounded-full"
          style={{ height: fluid(PILL_LAYOUT.height), backgroundImage: gradient }}
        >
          <div
            className="absolute top-1/2 flex -translate-y-1/2 items-center justify-center overflow-hidden rounded-full bg-white shadow-[inset_0_2px_8px_rgba(0,0,0,0.15)]"
            style={{
              left: fluid(PILL_LAYOUT.idCircle.left),
              width: fluid(PILL_LAYOUT.idCircle.size),
              height: fluid(PILL_LAYOUT.idCircle.size),
            }}
          >
            <span
              className="font-pretendard font-bold text-center"
              style={{
                color: accent,
                fontSize: fluid(20),
                letterSpacing: "-0.02em",
                lineHeight: lh.body,
              }}
            >
              {product.displayID}
            </span>
          </div>
          <div
            className="absolute top-0 flex items-center justify-center font-bethany-elingston text-white"
            style={{
              left: fluid(NAME_BOX_LEFT),
              width: fluid(PILL_LAYOUT.nameBox.width),
              height: fluid(PILL_LAYOUT.nameBox.height),
            }}
          >
            <p
              className="m-0 w-full text-center"
              style={{
                fontSize: fluid(24),
                lineHeight: fluid(27),
              }}
            >
              {product.productName}
            </p>
          </div>
        </div>

        <a
          href={product.buyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="buy-button flex w-full cursor-pointer items-center justify-center rounded-full border border-[#DDDDDD] bg-white text-[#101010] no-underline transition-colors hover:bg-[#F4F4F4] active:bg-[#EEEEEE] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#101010]/15"
          style={{
            gap: fluid(5),
            padding: `${fluid(10)} 0`,
            fontSize: fluid(13),
            letterSpacing: "-0.02em",
            lineHeight: lh.body,
          }}
        >
          {product.buyLabel}
          <img
            src={linkLogoSrc}
            alt=""
            aria-hidden="true"
            className="block object-contain"
            style={{ width: fluid(20), height: fluid(20) }}
          />
        </a>

        <ProductImage product={product} variant={variant} />
      </div>
    </div>
  );
}
