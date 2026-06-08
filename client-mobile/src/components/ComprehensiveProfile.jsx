import { fluid, lh } from "../utils/fluid.js";
import MetricBar from "./MetricBar.jsx";

const TEMPERATURE_GRADIENT =
  "linear-gradient(90deg, #F49863 0%, #FFF7E2 37.5%, #FFFFFF 50%, #E6F1FD 62.5%, #8AB5DA 100%)";
const LUMINOSITY_GRADIENT = "linear-gradient(90deg, #000000 0%, #FFFFFF 100%)";
const CHROMA_GRADIENT =
  "linear-gradient(90deg, #ABABAB 0%, #73A6A7 65.64%, #E54E20 100%)";

function MetricRow({ title, subtitle, valueLabel, percent, gradient }) {
  return (
    <div className="w-full" style={{ display: "flex", flexDirection: "column", gap: fluid(20) }}>
      <div className="flex w-full items-center justify-between">
        <div
          className="font-pretendard"
          style={{ display: "flex", flexDirection: "column", gap: fluid(4), fontSize: fluid(16), lineHeight: lh.body }}
        >
          <p className="m-0 font-semibold uppercase text-[#101010]">{title}</p>
          <p className="m-0 text-[#6F6F6F]">{subtitle}</p>
        </div>
        <div
          className="flex shrink-0 items-center justify-center rounded-full border border-[#DDDDDD] bg-white font-pretendard font-semibold text-[#101010]"
          style={{
            height: fluid(40),
            padding: `${fluid(8)} ${fluid(30)}`,
            fontSize: fluid(16),
            letterSpacing: "-0.02em",
          }}
        >
          {valueLabel}
        </div>
      </div>
      <MetricBar percent={percent} gradient={gradient} />
    </div>
  );
}

function Divider() {
  return <div className="w-full border-t border-[#DDDDDD]" style={{ maxWidth: fluid(362) }} />;
}

export default function ComprehensiveProfile({ metrics }) {
  if (!metrics) {
    return null;
  }

  return (
    <div className="flex w-full flex-col items-center" style={{ gap: fluid(30) }}>
      <MetricRow
        title="Temperature"
        subtitle="색온도"
        valueLabel={metrics.temperatureLabel}
        percent={metrics.temperaturePercent}
        gradient={TEMPERATURE_GRADIENT}
      />
      <Divider />
      <MetricRow
        title="Luminosity"
        subtitle="명도"
        valueLabel={metrics.brightnessLabel}
        percent={metrics.brightnessPercent}
        gradient={LUMINOSITY_GRADIENT}
      />
      <Divider />
      <MetricRow
        title="Chroma"
        subtitle="채도"
        valueLabel={metrics.chromaLabel}
        percent={metrics.saturationPercent}
        gradient={CHROMA_GRADIENT}
      />
    </div>
  );
}
