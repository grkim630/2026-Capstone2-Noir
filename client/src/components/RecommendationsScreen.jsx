import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { buildRecommendationViewModel } from "../utils/recommendationViewModel.js";

const DESIGN_WIDTH = 1920;
const DESIGN_HEIGHT = 1080;

const backgroundSrc = "/data/images/sideroom_back.png";

const PANEL_EXPAND_MS = 900;
const TEXT_REVEAL_MS = 380;
const IMAGE_REVEAL_MS = 480;
const CHIP_PLACEHOLDER_COLOR = "#DDDDDD";
const CHIP_CARD_WIDTH = 210;
const CHIPS_PER_ROW = 3;
const CHIP_EXPAND_MS = 450;
const CHIP_EXPAND_STAGGER_MS = 100;
const CHIP_ROW_BASE_DELAY_MS = 300;
const CODE_AFTER_EXPAND_MS = Math.round(CHIP_EXPAND_MS * 0.52);
const IMAGE_AFTER_EXPAND_MS = CHIP_EXPAND_MS + 90;
const CHIP_GAP = 20;
const CHIP_TRACK_WIDTH = CHIPS_PER_ROW * CHIP_CARD_WIDTH + (CHIPS_PER_ROW - 1) * CHIP_GAP;

const CHIP_REVEAL_EASE = [0.22, 1, 0.36, 1];

function getChipExpandDelay(chipIndex) {
  return CHIP_ROW_BASE_DELAY_MS + chipIndex * CHIP_EXPAND_STAGGER_MS;
}

function getChipCodeAt(chipIndex) {
  return getChipExpandDelay(chipIndex) + CODE_AFTER_EXPAND_MS;
}

function getChipImageAt(chipIndex) {
  return getChipExpandDelay(chipIndex) + IMAGE_AFTER_EXPAND_MS;
}

function getEyesTextAt() {
  return getChipCodeAt(CHIPS_PER_ROW - 1);
}

function getEyesImageAt() {
  return getChipImageAt(CHIPS_PER_ROW - 1);
}

function getEyesShadesAt() {
  return getEyesImageAt() + 160;
}

function ColorChipImage({
  src,
  active = false,
  className = "absolute inset-0 size-full object-cover",
  onRevealed,
}) {
  const imageRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
  }, [src]);

  useEffect(() => {
    if (!active) {
      return;
    }
    const image = imageRef.current;
    if (image?.complete && image.naturalWidth > 0) {
      setIsLoaded(true);
    }
  }, [src, active]);

  useEffect(() => {
    if (active && isLoaded) {
      onRevealed?.();
    }
  }, [active, isLoaded, onRevealed]);

  return (
    <>
      <div className="absolute inset-0" style={{ backgroundColor: CHIP_PLACEHOLDER_COLOR }} />
      {active && !hasError && (
        <motion.img
          ref={imageRef}
          src={src}
          alt=""
          className={className}
          initial={{ opacity: 0 }}
          animate={{ opacity: isLoaded ? 1 : 0 }}
          transition={{ duration: IMAGE_REVEAL_MS / 1000, ease: "easeOut" }}
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
        />
      )}
    </>
  );
}

/** LIPS / BLUSH / EYES 바깥 섹션 — Figma는 투명(bg 없음), 살짝 글래스로 영역 구분 */
const SECTION_GLASS_CLASS =
  "rounded-[50px] border border-white/12 bg-white/[0.02] backdrop-blur-[3px] shadow-[inset_0_1px_0_rgba(255,255,255,0.16),inset_0_-18px_42px_rgba(255,255,255,0.02),0_12px_40px_rgba(0,0,0,0.03)]";

function ProductTag({ productEn, productKo, widthPx = 200 }) {
  return (
    <div
      className="relative flex h-[70px] shrink-0 items-center justify-center overflow-hidden rounded-[80px] px-[40px] py-[20px] shadow-[2px_2px_10px_0px_rgba(48,48,48,0.1)]"
      style={{ width: widthPx }}
    >
      <div
        className="pointer-events-none absolute inset-0 rounded-[80px] bg-white/[0.15]"
        aria-hidden="true"
      />
      <div className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_2px_2px_10px_0px_rgba(48,48,48,0.1)]" />
      <div className="relative flex flex-col items-center justify-center gap-[6px] text-center text-[#101010]">
        <span className="font-paperlogy-regular text-[14px] leading-[1.1] tracking-[1.12px]">
          {productEn}
        </span>
        <span className="font-paperlogy-bold text-[14px] leading-[1.1]">{productKo}</span>
      </div>
    </div>
  );
}

function CategoryBadge({ label }) {
  return (
    <div className="flex size-[70px] shrink-0 items-center justify-center rounded-full bg-[#101010] p-[30px]">
      <span className="font-pretendard text-[16px] font-semibold uppercase leading-[1.4] tracking-[-0.32px] text-white">
        {label}
      </span>
    </div>
  );
}

function ColorChipCard({
  item,
  chipIndex,
  chipRadiusClass = "rounded-[12px]",
}) {
  const expandDelay = getChipExpandDelay(chipIndex) / 1000;
  const [showCode, setShowCode] = useState(false);
  const [showImage, setShowImage] = useState(false);
  const [imageRevealed, setImageRevealed] = useState(false);

  useEffect(() => {
    setShowCode(false);
    setShowImage(false);
    setImageRevealed(false);

    const codeTimer = window.setTimeout(() => setShowCode(true), getChipCodeAt(chipIndex));
    const imageTimer = window.setTimeout(() => setShowImage(true), getChipImageAt(chipIndex));

    return () => {
      window.clearTimeout(codeTimer);
      window.clearTimeout(imageTimer);
    };
  }, [chipIndex, item.imageSrc]);

  useEffect(() => {
    if (!showImage) {
      setImageRevealed(false);
    }
  }, [showImage, item.imageSrc]);

  return (
    <motion.div
      className="box-border flex h-[268px] shrink-0 flex-col items-start justify-between overflow-hidden rounded-[35px] bg-white/50 px-[15px] pt-[15px] pb-[25px]"
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: CHIP_CARD_WIDTH, opacity: 1 }}
      transition={{
        width: {
          duration: CHIP_EXPAND_MS / 1000,
          delay: expandDelay,
          ease: CHIP_REVEAL_EASE,
        },
        opacity: {
          duration: 0.25,
          delay: expandDelay,
          ease: "easeOut",
        },
      }}
      style={{ transformOrigin: "left center" }}
    >
      <div className={`relative size-[180px] shrink-0 overflow-hidden ${chipRadiusClass}`}>
        <ColorChipImage
          src={item.imageSrc}
          active={showImage}
          onRevealed={() => setImageRevealed(true)}
        />
        <AnimatePresence>
          {showCode && (
            <motion.span
              className="absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2 font-['Inter',sans-serif] text-[24px] leading-[1.4] font-bold whitespace-nowrap text-white"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: TEXT_REVEAL_MS / 1000, ease: "easeOut" }}
            >
              {item.displayID}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      <AnimatePresence>
        {showCode && (
          <motion.p
            className="font-bethany-elingston mt-[6px] w-full min-w-0 shrink-0 translate-y-[10px] text-center text-[24px] leading-[1.4] uppercase"
            initial={{ opacity: 0, y: 6, color: CHIP_PLACEHOLDER_COLOR }}
            animate={{
              opacity: 1,
              y: 0,
              color: imageRevealed ? item.color : CHIP_PLACEHOLDER_COLOR,
            }}
            transition={{
              opacity: { duration: TEXT_REVEAL_MS / 1000, ease: "easeOut" },
              y: { duration: TEXT_REVEAL_MS / 1000, ease: "easeOut" },
              color: { duration: IMAGE_REVEAL_MS / 1000, ease: "easeOut" },
            }}
          >
            {item.displayName}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ProductRow({ row, chipRadiusClass }) {
  if (!row?.items?.length) {
    return null;
  }

  return (
    <div
      className={`flex w-full min-w-fit items-start gap-[30px] overflow-visible py-[20px] pr-[30px] pl-[30px] ${SECTION_GLASS_CLASS}`}
    >
      <div className="flex shrink-0 items-center gap-[20px] py-[10px]">
        <CategoryBadge label={row.category} />
        <ProductTag productEn={row.productEn} productKo={row.productKo} />
      </div>
      <div
        className="flex h-[268px] shrink-0 items-center gap-[20px] overflow-visible"
        style={{ width: CHIP_TRACK_WIDTH }}
      >
        {row.items.map((item, index) => (
          <ColorChipCard
            key={`${row.category}-${item.categoryRank ?? index}-${item.displayID}`}
            item={item}
            chipIndex={index}
            chipRadiusClass={chipRadiusClass}
          />
        ))}
      </div>
    </div>
  );
}

function EyesPanel({ panel }) {
  const [showText, setShowText] = useState(false);
  const [showImage, setShowImage] = useState(false);
  const [showShades, setShowShades] = useState(false);

  useEffect(() => {
    setShowText(false);
    setShowImage(false);
    setShowShades(false);

    const textTimer = window.setTimeout(() => setShowText(true), getEyesTextAt());
    const imageTimer = window.setTimeout(() => setShowImage(true), getEyesImageAt());
    const shadesTimer = window.setTimeout(() => setShowShades(true), getEyesShadesAt());

    return () => {
      window.clearTimeout(textTimer);
      window.clearTimeout(imageTimer);
      window.clearTimeout(shadesTimer);
    };
  }, [panel?.displayID, panel?.imageSrc]);

  if (!panel) {
    return null;
  }

  return (
    <motion.div
      className={`flex shrink-0 flex-col items-center gap-[50px] p-[20px] ${SECTION_GLASS_CLASS}`}
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: PANEL_EXPAND_MS / 1000, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="relative h-[70px] w-[450px]">
        <CategoryBadge label={panel.category} />
        <div className="absolute top-0 left-1/2 -translate-x-1/2">
          <ProductTag productEn={panel.productEn} productKo={panel.productKo} widthPx={223} />
        </div>
      </div>

      <div className="flex size-[300px] items-center justify-center overflow-hidden rounded-full bg-white/20 p-[20px]">
        <div className="relative size-[260px] overflow-hidden rounded-full">
          <ColorChipImage src={panel.imageSrc} active={showImage} />
          <AnimatePresence>
            {showText && (
              <motion.div
                className="pointer-events-none absolute top-1/2 left-1/2 z-10 flex w-[109px] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-[2px] text-center text-[24px] leading-[1.1] text-white"
                style={{ textShadow: "0px 0px 10px rgba(0,0,0,0.15)" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: TEXT_REVEAL_MS / 1000, ease: "easeOut" }}
              >
                <span className="font-['Inter',sans-serif] leading-[1.1] font-bold">{panel.displayID}</span>
                <span className="font-bethany-elingston leading-[1.1] not-italic">{panel.displayName}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {showShades && (
          <motion.div
            className="grid h-[128px] w-[450px] grid-cols-2 grid-rows-2 gap-[20px]"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: TEXT_REVEAL_MS / 1000, ease: "easeOut" }}
          >
            {panel.shades.map((shade) => (
              <div
                key={shade.key}
                className="flex items-center gap-[10px] self-stretch overflow-hidden rounded-[50px] bg-white/50 px-[15px]"
              >
                <div className="relative size-[30px] shrink-0 overflow-hidden rounded-full">
                  <ColorChipImage src={shade.imageSrc} active={showImage} />
                </div>
                <span className="font-pretendard text-[14px] font-semibold leading-[1.4] text-[#101010]">
                  {shade.label}
                </span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function RecommendationsScreen({ result, onGoToTesting }) {
  const [sceneScale, setSceneScale] = useState(1);
  const [resolvedResult, setResolvedResult] = useState(result?.recommendationResult ?? null);

  const viewModel = useMemo(
    () => buildRecommendationViewModel(resolvedResult),
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
        // Dev entry without server: layout still renders.
      }
    }

    fetchLatestRecommendation();

    return () => {
      isMounted = false;
    };
  }, [resolvedResult, result?.recommendationResult]);

  useEffect(() => {
    if (!viewModel) {
      return;
    }

    const imageSources = [
      ...viewModel.lip.map((item) => item.imageSrc),
      ...viewModel.blush.map((item) => item.imageSrc),
      viewModel.eyesPanel?.imageSrc,
      ...(viewModel.eyesPanel?.shades.map((shade) => shade.imageSrc) ?? []),
    ].filter(Boolean);

    imageSources.forEach((src) => {
      const image = new Image();
      image.src = src;
    });
  }, [viewModel]);

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
        <div className="absolute top-[calc(50%-425.5px)] left-1/2 h-[96px] w-[1620px] -translate-x-1/2 -translate-y-1/2">
          <div className="absolute top-[48px] left-0 w-[387px] -translate-y-1/2">
            <h1 className="font-bethany-elingston text-[48px] leading-none text-[#101010]">
              Color
              <br />
              Recommendations
            </h1>
          </div>
          <div className="absolute top-[12.5px] left-[600px] h-[72px] w-[1020px]">
            <p className="font-pretendard absolute top-[36px] left-[-15px] -translate-y-1/2 text-[20px] leading-[1.2] tracking-[-0.4px] whitespace-nowrap text-[#3F3F3F]">
              분석이 완료된 현재의 톤에 맞추어
              <br />
              립, 블러쉬, 아이팔레트의 컬러를
              <br />
              추천합니다.
            </p>
          </div>
        </div>

        <motion.div
          className="absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-start gap-[100px]"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: PANEL_EXPAND_MS / 1000, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flex w-[1040px] shrink-0 flex-col gap-[20px] overflow-visible">
            {viewModel && (
              <>
                <ProductRow
                  row={viewModel.lipRow}
                  chipRadiusClass="rounded-[12px]"
                />
                <ProductRow
                  row={viewModel.blushRow}
                  chipRadiusClass="rounded-[20px]"
                />
              </>
            )}
          </div>
          {viewModel?.eyesPanel && (
            <EyesPanel panel={viewModel.eyesPanel} />
          )}
        </motion.div>

        <motion.button
          type="button"
          onClick={onGoToTesting}
          whileHover={{ scale: 1.02, boxShadow: "0 12px 32px rgba(0,0,0,0.1)" }}
          whileTap={{ scale: 0.98 }}
          className="absolute top-[940px] left-[735px] flex h-[80px] w-[450px] items-center justify-center rounded-full bg-white py-[15px] shadow-[0px_0px_20px_0px_rgba(0,0,0,0.05)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#101010]/20"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            opacity: { delay: 0.5, duration: 0.45, ease: "easeOut" },
            y: { delay: 0.5, duration: 0.45, ease: "easeOut" },
            default: { duration: 0.12, ease: "easeOut" },
          }}
        >
          <span className="font-pretendard text-[24px] leading-[1.4] font-bold tracking-[-0.48px] text-[#101010]">
            테스팅 하러가기
          </span>
        </motion.button>
      </section>
    </motion.main>
  );
}
