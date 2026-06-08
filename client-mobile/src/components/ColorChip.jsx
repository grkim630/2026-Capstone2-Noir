import { fluid, lh } from "../utils/fluid.js";

export default function ColorChip({ label, hex }) {
  const displayHex = String(hex || "#DDDDDD").toUpperCase();

  return (
    <div
      className="relative min-w-0 flex-1 overflow-hidden"
      style={{ backgroundColor: hex, height: fluid(140) }}
    >
      <div
        className="absolute bottom-0 left-0 flex flex-col font-pretendard text-white mix-blend-soft-light"
        style={{
          left: fluid(12),
          bottom: fluid(12),
          gap: fluid(4),
          fontSize: fluid(14),
          lineHeight: lh.chipTight,
        }}
      >
        <span className="font-semibold whitespace-pre-line">{label}</span>
        <span className="font-extralight tracking-[-0.02em]">{displayHex}</span>
      </div>
    </div>
  );
}
