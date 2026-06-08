import { arrowEndSrc, arrowSrc } from "../utils/assets.js";
import { fluid } from "../utils/fluid.js";

export default function ScrollArrow({ variant = "arrow", height = 54 }) {
  const src = variant === "arrow_end" ? arrowEndSrc : arrowSrc;

  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      className="block max-w-none object-contain"
      style={{ height: fluid(height), width: "auto" }}
    />
  );
}
