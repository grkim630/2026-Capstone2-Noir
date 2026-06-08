import { levelLabels } from "../utils/metrics.js";
import { fluid, lh } from "../utils/fluid.js";
import ColorChip from "./ColorChip.jsx";

const MELANIN_GRADIENT =
  "linear-gradient(142.66deg, #FEDE9F 7.63%, #F6C670 41.98%, #E99B53 81.64%)";
const REDNESS_GRADIENT =
  "linear-gradient(-45.36deg, #DF827A 20.39%, #FFEBD9 97.87%)";

function ToneChip({ label, value, gradient }) {
  return (
    <div
      className="relative min-w-0 flex-1 overflow-hidden"
      style={{ backgroundImage: gradient, height: fluid(140) }}
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
        <span className="font-semibold">{label}</span>
        <span className="font-extralight tracking-[-0.02em]">{value}</span>
      </div>
    </div>
  );
}

export default function FaceColorMap({ faceColors, melanin, redness }) {
  if (!faceColors) {
    return null;
  }

  const gap = fluid(4);

  return (
    <div className="w-full overflow-hidden rounded-[8px]" style={{ gap }}>
      <div className="flex w-full" style={{ gap, marginBottom: gap }}>
        {faceColors.facialRow1.map((chip) => (
          <ColorChip key={chip.label} {...chip} />
        ))}
      </div>
      <div className="flex w-full" style={{ gap, marginBottom: gap }}>
        {faceColors.facialRow2.map((chip) => (
          <ColorChip key={chip.label} {...chip} />
        ))}
      </div>
      <div className="flex w-full" style={{ gap }}>
        <ToneChip
          label="누런기"
          value={levelLabels[melanin] || melanin}
          gradient={MELANIN_GRADIENT}
        />
        <ToneChip
          label="붉은기"
          value={levelLabels[redness] || redness}
          gradient={REDNESS_GRADIENT}
        />
      </div>
    </div>
  );
}
