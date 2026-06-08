import { logoMbSrc, posterSrc } from "../utils/assets.js";
import { fluid, lh } from "../utils/fluid.js";
import ScrollArrow from "./ScrollArrow.jsx";

export default function HeroSection() {
  return (
    <section className="relative w-full overflow-hidden bg-white">
      <div
        className="relative w-full overflow-hidden"
        style={{ height: fluid(730) }}
      >
        <img
          src={posterSrc}
          alt=""
          className="absolute left-1/2 top-0 h-[114.43%] w-[155%] max-w-none -translate-x-1/2 object-cover"
          style={{ top: fluid(-69) }}
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0) 55.07%, #FFFFFF 99.1%)",
          }}
        />
        <img
          src={logoMbSrc}
          alt="MUZIGAE MANSION x NOIR"
          className="absolute bottom-0 left-1/2 h-auto max-w-none -translate-x-1/2 object-contain"
          style={{
            bottom: fluid(50),
            width: fluid(190),
            height: fluid(160),
          }}
        />
      </div>

      <div
        className="mx-auto flex flex-col items-center"
        style={{
          width: fluid(376),
          marginTop: fluid(20),
          gap: fluid(60),
          paddingBottom: fluid(80),
        }}
      >
        <ScrollArrow variant="arrow" height={60} />
        <div
          className="text-center font-pretendard text-[#101010]"
          style={{ fontSize: fluid(16), lineHeight: lh.tight }}
        >
          <p className="m-0">누아르의 여정에</p>
          <p className="m-0">함께해주셔서 감사합니다.</p>
        </div>
        <ScrollArrow variant="arrow_end" height={54} />
      </div>
    </section>
  );
}
