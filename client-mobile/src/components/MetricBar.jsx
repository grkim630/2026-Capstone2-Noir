import { fluid } from "../utils/fluid.js";

const BAR_WIDTH = 362;
const HANDLE_WIDTH = 30;
const HANDLE_PILL_WIDTH = 13;

export default function MetricBar({ percent, gradient }) {
  const safePercent = Math.min(Math.max(percent ?? 50, 0), 100);
  const handleLeft = (BAR_WIDTH * safePercent) / 100 - HANDLE_WIDTH / 2;

  return (
    <div
      className="relative flex w-full items-center justify-center"
      style={{ height: fluid(62) }}
    >
      <div
        className="w-full overflow-hidden rounded-full"
        style={{
          height: fluid(20),
          background: gradient,
          maxWidth: fluid(BAR_WIDTH),
        }}
      />
      <div
        className="absolute top-0 flex items-center justify-center rounded-full border border-white/70 bg-[#101010]/[0.04] shadow-[0_8px_20px_rgba(0,0,0,0.08)]"
        style={{
          left: fluid(handleLeft),
          width: fluid(HANDLE_WIDTH),
          height: fluid(62),
          padding: `${fluid(12)} ${fluid(10)}`,
        }}
      >
        <div
          className="rounded-full bg-white shadow-[0_8px_18px_rgba(0,0,0,0.12)]"
          style={{ width: fluid(HANDLE_PILL_WIDTH), height: fluid(40) }}
        />
      </div>
    </div>
  );
}
