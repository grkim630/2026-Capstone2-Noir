import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { buildTestingCompleteChips } from "../utils/recommendationViewModel.js";

const DESIGN_WIDTH = 1920;
const DESIGN_HEIGHT = 1080;

const backgroundSrc = "/data/images/end_background.png";
const logoSrc = "/data/images/logo_red.png";

/** CaptureCompleteScreen 「분석 시작하기」 버튼 좌·우 장식과 동일 스타일 */
function GuideLineLeft() {
  return <span className="block h-[2px] w-[230px] shrink-0 bg-[#101010]" aria-hidden="true" />;
}

function GuideLineRight() {
  return (
    <span className="relative block h-[2px] w-[230px] shrink-0 bg-[#101010]" aria-hidden="true">
      <span className="absolute top-1/2 right-0 h-[8px] w-[8px] -translate-y-1/2 rotate-45 border-t-3 border-r-3 border-[#101010]" />
    </span>
  );
}

const CHIP_NAME_CLASS =
  "font-bethany-elingston text-[12px] leading-[1.2] font-normal tracking-[0.02em] text-white uppercase antialiased";

function SmallColorChip({ chip }) {
  if (chip.kind === "eye_palette") {
    return (
      <div className="flex shrink-0 flex-col overflow-hidden rounded-[18px] bg-white/50 p-[10px]">
        <div className="relative size-[90px] overflow-hidden rounded-[10px]">
          <img
            src={chip.imageSrc}
            alt=""
            className="absolute inset-0 size-full object-cover"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
          <p
            className="font-bethany-elingston absolute top-1/2 left-1/2 w-max max-w-[86px] -translate-x-1/2 translate-y-[calc(-50%+4px)] text-center text-[12px] leading-[1.2] font-normal tracking-[0.02em] text-white antialiased"
          >
            {chip.displayName}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex shrink-0 flex-col overflow-hidden rounded-[18px] bg-white/50 p-[10px]">
      <div className="relative size-[90px] overflow-hidden rounded-[10px]">
        <img
          src={chip.imageSrc}
          alt=""
          className="absolute inset-0 size-full object-cover"
          onError={(event) => {
            event.currentTarget.style.display = "none";
            event.currentTarget.parentElement.style.backgroundColor = chip.color;
          }}
        />
        <div className="absolute top-1/2 left-1/2 flex w-[72px] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-[6px] text-center text-[12px] leading-[1.4] text-white">
          <span className={`${CHIP_NAME_CLASS} max-w-[72px]`}>{chip.displayName}</span>
          <span className="font-['Inter',sans-serif] translate-y-[7px] font-bold">{chip.displayID}</span>
        </div>
      </div>
    </div>
  );
}

export default function TestingCompleteScreen({ result }) {
  const [sceneScale, setSceneScale] = useState(1);
  const [resolvedResult, setResolvedResult] = useState(result?.recommendationResult ?? null);

  const chips = useMemo(
    () => buildTestingCompleteChips(resolvedResult),
    [resolvedResult],
  );

  useEffect(() => {
    const updateSceneScale = () => {
      setSceneScale(
        Math.min(window.innerWidth / DESIGN_WIDTH, window.innerHeight / DESIGN_HEIGHT),
      );
    };

    updateSceneScale();
    window.addEventListener("resize", updateSceneScale);

    return () => window.removeEventListener("resize", updateSceneScale);
  }, []);

  useEffect(() => {
    if (result?.recommendationResult) {
      setResolvedResult(result.recommendationResult);
    }
  }, [result?.recommendationResult]);

  useEffect(() => {
    if (resolvedResult || result?.recommendationResult) {
      return undefined;
    }

    let isMounted = true;

    async function fetchLatestRecommendation() {
      try {
        const response = await fetch("/api/capture/latest");
        if (!response.ok) {
          return;
        }
        const latestCapture = await response.json();
        if (isMounted && latestCapture?.recommendationResult) {
          setResolvedResult(latestCapture.recommendationResult);
        }
      } catch {
        // Optional in dev without server.
      }
    }

    fetchLatestRecommendation();

    return () => {
      isMounted = false;
    };
  }, [resolvedResult, result?.recommendationResult]);

  return (
    <motion.main
      className="relative flex h-screen w-screen items-center justify-center overflow-hidden bg-white font-sans"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.55, ease: "easeOut" }}
    >
      <img
        className="absolute inset-0 h-full w-full object-cover"
        src={backgroundSrc}
        alt=""
        aria-hidden="true"
      />

      <section
        className="relative z-10 h-[1080px] w-[1920px] shrink-0 overflow-visible"
        style={{ transform: `scale(${sceneScale})` }}
      >
        <img
          src={logoSrc}
          alt="MUZIGAE MANSION x NOIR"
          className="absolute top-[80px] left-1/2 h-[120px] w-[139px] -translate-x-1/2 object-contain"
        />

        <motion.div
          className="absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-[40px]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flex h-[80px] items-center justify-center gap-[32px]">
            <GuideLineLeft />
            <p className="font-pretendard shrink-0 text-center text-[24px] leading-[1.4] font-medium tracking-[-0.48px] whitespace-nowrap text-[#101010]">
              추천받으신 제품 정보를 저장했어요!
              <br />
              테스팅 섹션으로 이동해주세요.
            </p>
            <GuideLineRight />
          </div>

          <div className="flex items-center gap-[10px]">
            {chips.map((chip, index) => (
              <motion.div
                key={
                  chip.kind === "eye_palette"
                    ? `eye-${chip.displayID}`
                    : `${chip.displayID}-${chip.displayName}`
                }
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.5,
                  delay: 0.08 + index * 0.05,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <SmallColorChip chip={chip} />
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>
    </motion.main>
  );
}
