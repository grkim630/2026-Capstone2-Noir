import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

const DESIGN_WIDTH = 1920;
const DESIGN_HEIGHT = 1080;

const resultBackgroundSrc = "/data/images/sideroom_back.png";

const COLOR_BOARD_TEXT_CLASS = "text-[#FFFFFF]/50";
const COLOR_BOARD_CHIP_STACK_CLASS =
  "flex h-full flex-col items-center justify-center gap-0 text-center font-pretendard leading-[1.05]";
const COLOR_BOARD_CHIP_LABEL_CLASS = "text-[20px] font-medium";
const COLOR_BOARD_CHIP_VALUE_CLASS = "-mt-[-4px] text-[20px] font-extralight";

const colorLabels = [
  { key: "lipColor", label: "입술" },
  { key: "cheekColor", label: "볼" },
  { key: "foreheadColor", label: "미간" },
  { key: "eyeAreaColor", label: "눈두덩이" },
  { key: "irisColor", label: "눈동자" },
];

const levelLabels = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

const toneLabels = {
  warm: "따뜻함",
  neutral: "내추럴",
  cool: "차가움",
  bright: "밝음",
  medium: "중간",
  deep: "어두움",
  clear: "맑음",
  muted: "탁함",
  high: "높음",
  low: "낮음",
};

function clamp(value, min = 0, max = 100) {
  return Math.min(Math.max(value, min), max);
}

function getHex(color, fallback = "#DDDDDD") {
  return color?.hex || fallback;
}

const TEMPERATURE_BAR_MIN = -15;
const TEMPERATURE_BAR_MAX = 15;
const BRIGHTNESS_BAR_MID = 66;
const SATURATION_BAR_MAX = 66;

/** 색온도 바: 왼쪽=따뜻함(b−a 큼), 오른쪽=차가움. 입력은 [-15, 15]로 클램프 */
function normalizeTemperature(value) {
  if (!Number.isFinite(value)) {
    return 50;
  }

  const clamped = clamp(value, TEMPERATURE_BAR_MIN, TEMPERATURE_BAR_MAX);
  if (clamped >= 5) {
    return clamp(((TEMPERATURE_BAR_MAX - clamped) / (TEMPERATURE_BAR_MAX - 5)) * 40);
  }
  if (clamped <= -5) {
    return clamp(60 + ((-5 - clamped) / (-5 - TEMPERATURE_BAR_MIN)) * 40);
  }
  return clamp(50 - clamped * 2);
}

/** 명도 바: 0→0%, 66→50%, 100→100% (0~100 클램프) */
function normalizeBrightness(value) {
  if (!Number.isFinite(value)) {
    return 50;
  }

  const clamped = clamp(value, 0, 100);
  if (clamped <= BRIGHTNESS_BAR_MID) {
    return (clamped / BRIGHTNESS_BAR_MID) * 50;
  }

  return 50 + ((clamped - BRIGHTNESS_BAR_MID) / (100 - BRIGHTNESS_BAR_MID)) * 50;
}

/** 채도 바: 0→0%, 66→100% (0~66 클램프). 왼쪽=낮은 채도, 오른쪽=높은 채도 */
function normalizeSaturation(value) {
  if (!Number.isFinite(value)) {
    return 50;
  }

  const clamped = clamp(value, 0, SATURATION_BAR_MAX);
  return (clamped / SATURATION_BAR_MAX) * 100;
}

function resolveFrontResult(result) {
  return result?.finalResult?.front || result?.front || result || null;
}

function resolveMetrics(frontResult) {
  const metrics = frontResult?.skinAnalysis?.metrics;
  const lab = frontResult?.skinAnalysis?.LAB;
  const hsv = frontResult?.skinAnalysis?.HSV;

  return {
    temperature: Number.isFinite(metrics?.temperature)
      ? metrics.temperature
      : Number.isFinite(lab?.b) && Number.isFinite(lab?.a)
        ? lab.b - lab.a
        : 0,
    brightness: Number.isFinite(metrics?.brightness) ? metrics.brightness : lab?.L,
    saturation: Number.isFinite(metrics?.saturation)
      ? metrics.saturation
      : Number.isFinite(hsv?.S)
        ? hsv.S * 100
        : 50,
  };
}

function GlassPanel({ className = "", children, ...props }) {
  return (
    <motion.div
      className={[
        "absolute overflow-visible rounded-[40px] border border-white/30 bg-white/[0.06] backdrop-blur-md",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.44),inset_0_-18px_42px_rgba(255,255,255,0.08),0_22px_70px_rgba(0,0,0,0.08)]",
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </motion.div>
  );
}

function FloatingLabel({ width, children, className = "" }) {
  return (
    <div
      className={[
        "absolute left-1/2 top-[20px] flex h-[66px] -translate-x-1/2 items-center justify-center gap-[20px]",
        "rounded-full border border-white/40 bg-white/50 font-pretendard text-[20px] text-[#101010] backdrop-blur-md",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_10px_26px_rgba(0,0,0,0.08)]",
        className,
      ].join(" ")}
      style={{ width }}
    >
      {children}
    </div>
  );
}

function ColorSegment({ item, frontResult, index }) {
  const hex = getHex(frontResult?.[item.key]);

  return (
    <motion.div
      className={[
        "h-full flex-1",
        COLOR_BOARD_CHIP_STACK_CLASS,
        COLOR_BOARD_TEXT_CLASS,
      ].join(" ")}
      style={{ backgroundColor: hex }}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.65 + index * 0.08, duration: 0.52, ease: [0.22, 1, 0.36, 1] }}
    >
      <span className={COLOR_BOARD_CHIP_LABEL_CLASS}>{item.label}</span>
      <span className={COLOR_BOARD_CHIP_VALUE_CLASS}>{hex.toUpperCase()}</span>
    </motion.div>
  );
}

function BoardBar({ top, label, children, delay = 0 }) {
  return (
    <div className="absolute left-[100px]" style={{ top }}>
      <motion.div
        className="absolute left-0 top-[-24px] h-[125px] w-[1000px] rounded-t-[30px] bg-[#DDDDDD]"
        initial={{ y: 28, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay, duration: 0.58, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
      <motion.div
        className="font-pretendard absolute left-[-25px] top-[55px] z-10 flex h-[70px] w-[1050px] items-center justify-center rounded-full border border-white/40 bg-white/70 text-[20px] font-normal text-[#101010] backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.68),0_14px_34px_rgba(0,0,0,0.08)]"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: delay + 0.15, duration: 0.45, ease: "easeOut" }}
      >
        {label}
      </motion.div>
    </div>
  );
}

function MetricCard({ title, subtitle, percent, gradient }) {
  const barLeft = 20;
  const barWidth = 330;

  return (
    <div className="relative h-[196px] w-[370px] rounded-[28px] border border-white/35 bg-white/[0.08] px-[30px] pt-[18px] backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.6),inset_0_-14px_32px_rgba(255,255,255,0.08),0_18px_46px_rgba(0,0,0,0.08)]">
      <div className="mt-[10px] text-center font-pretendard leading-[1.1] text-[#101010]">
        <div className="text-[20px] font-semibold">{title}</div>
        {subtitle && (
          <div className="-mt-[-6px] text-[20px] font-extralight text-[#3F3F3F]">{subtitle}</div>
        )}
      </div>
      <div
        className="absolute left-[20px] top-[116px] h-[25px] w-[330px] overflow-hidden rounded-full bg-[#DDDDDD]"
        style={{ background: gradient }}
      />
      <motion.div
        className="absolute top-[90px] h-[77px] w-[37px] rounded-full border border-white/70 bg-[#101010]/[0.04] shadow-[0_8px_20px_rgba(0,0,0,0.08)]"
        initial={{ left: barLeft + barWidth / 2 - 18.5, opacity: 0 }}
        animate={{ left: barLeft + (barWidth * percent) / 100 - 18.5, opacity: 1 }}
        transition={{ delay: 1.1, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="absolute left-1/2 top-1/2 h-[53px] w-[17px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_8px_18px_rgba(0,0,0,0.12)]" />
      </motion.div>
    </div>
  );
}

export default function AnalysisResultScreen({ result, onRecommend }) {
  const [sceneScale, setSceneScale] = useState(1);
  const [latestResult, setLatestResult] = useState(null);
  const displayResult = result || latestResult;
  const frontResult = useMemo(() => resolveFrontResult(displayResult), [displayResult]);
  const metrics = useMemo(() => resolveMetrics(frontResult), [frontResult]);
  const melanin = frontResult?.skinAnalysis?.melanin || "medium";
  const redness = frontResult?.skinAnalysis?.redness || "medium";
  const personalColor = frontResult?.personalColor || {};
  const skinTone = frontResult?.skinAnalysis?.tone || {};

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
    if (result) {
      return undefined;
    }

    let isMounted = true;

    async function fetchLatestResult() {
      try {
        const response = await fetch("/api/capture/latest");
        if (!response.ok) {
          return;
        }

        const latestCapture = await response.json();
        if (isMounted) {
          setLatestResult(latestCapture);
        }
      } catch {
        // Result data is optional in dev entry mode; the page still renders the base layout.
      }
    }

    fetchLatestResult();

    return () => {
      isMounted = false;
    };
  }, [result]);

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
        src={resultBackgroundSrc}
        alt=""
        aria-hidden="true"
      />

      <section
        className="relative z-10 h-[1080px] w-[1920px] shrink-0 overflow-visible"
        style={{ transform: `scale(${sceneScale})` }}
      >
        <div className="absolute left-[100px] top-[520px] -translate-y-1/2 text-left text-[#101010]">
          <h1 className="font-bethany-elingston text-[48px] font-normal leading-[0.94] tracking-[-0.04em]">
            Color Analysis
            <br />
            Report
          </h1>
          <p className="mt-[26px] h-[66px] w-[222px] whitespace-pre-line font-pretendard text-[16px] font-normal leading-[1.34] tracking-[-0.02em] text-[#3F3F3F]">
            입술, 볼, 눈동자 등 안면 각 부위의{"\n"}
            색상을 추출해 객관적 수치로{"\n"}
            시각화한 데이터입니다.
          </p>

          <motion.button
            type="button"
            onClick={onRecommend}
            whileHover={{ scale: 1.02, boxShadow: "0 12px 32px rgba(0,0,0,0.1)" }}
            whileTap={{ scale: 0.98 }}
            className="mt-[64px] flex h-[80px] w-[400px] items-center justify-center rounded-full bg-white shadow-[0_8px_24px_rgba(0,0,0,0.08)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#101010]/20"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              opacity: { delay: 0.35, duration: 0.45, ease: "easeOut" },
              y: { delay: 0.35, duration: 0.45, ease: "easeOut" },
              default: { duration: 0.12, ease: "easeOut" },
            }}
          >
            <span className="font-pretendard text-[24px] font-bold leading-none tracking-[-0.02em] text-[#101010]">
              톤에 맞춘 제품 추천
            </span>
          </motion.button>
        </div>

        <GlassPanel
          className="left-[600px] top-[120px] h-[449px] w-[1250px]"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <FloatingLabel width={314}>
            <span className="font-pretendard font-semibold">COLOR BOARD</span>
            <span className="font-['Paperlogy','Pretendard',sans-serif] font-normal">컬러 보드</span>
          </FloatingLabel>

          <BoardBar top={132} label="Facial Color Extraction" delay={0.2}>
            <div className="flex h-[85px] w-full overflow-hidden rounded-t-[30px]">
              {colorLabels.map((item, index) => (
                <ColorSegment
                  key={item.key}
                  item={item}
                  frontResult={frontResult}
                  index={index}
                />
              ))}
            </div>
          </BoardBar>

          <BoardBar top={302} label="Base Tone" delay={0.35}>
            <div className="flex h-[85px] w-full overflow-hidden rounded-t-[30px]">
              <motion.div
                className={[
                  "h-full flex-[1.05]",
                  COLOR_BOARD_CHIP_STACK_CLASS,
                  COLOR_BOARD_TEXT_CLASS,
                ].join(" ")}
                style={{ backgroundColor: getHex(frontResult?.skinColor) }}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9, duration: 0.52, ease: [0.22, 1, 0.36, 1] }}
              >
                <span className={COLOR_BOARD_CHIP_LABEL_CLASS}>베이스 파운데이션</span>
                <span className={COLOR_BOARD_CHIP_VALUE_CLASS}>
                  {getHex(frontResult?.skinColor).toUpperCase()}
                </span>
              </motion.div>
              <motion.div
                className={[
                  "h-full flex-1 bg-[linear-gradient(90deg,rgba(243,208,142,0.9)_0%,rgba(222,168,72,0.95)_46%,rgba(153,90,32,0.98)_100%)]",
                  COLOR_BOARD_CHIP_STACK_CLASS,
                  COLOR_BOARD_TEXT_CLASS,
                ].join(" ")}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.98, duration: 0.52, ease: [0.22, 1, 0.36, 1] }}
              >
                <span className={COLOR_BOARD_CHIP_LABEL_CLASS}>누런기</span>
                <span className={COLOR_BOARD_CHIP_VALUE_CLASS}>
                  {levelLabels[melanin] || melanin}
                </span>
              </motion.div>
              <motion.div
                className={[
                  "h-full flex-1 bg-[linear-gradient(90deg,rgba(255,235,217,0.92)_0%,rgba(223,130,122,0.98)_100%)]",
                  COLOR_BOARD_CHIP_STACK_CLASS,
                  COLOR_BOARD_TEXT_CLASS,
                ].join(" ")}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.06, duration: 0.52, ease: [0.22, 1, 0.36, 1] }}
              >
                <span className={COLOR_BOARD_CHIP_LABEL_CLASS}>붉은기</span>
                <span className={COLOR_BOARD_CHIP_VALUE_CLASS}>
                  {levelLabels[redness] || redness}
                </span>
              </motion.div>
            </div>
          </BoardBar>
        </GlassPanel>

        <GlassPanel
          className="left-[600px] top-[640px] h-[332px] w-[1250px]"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <FloatingLabel width={443}>
            <span className="font-pretendard font-semibold">COMPREHENSIVE PROFILE</span>
            <span className="font-['Paperlogy','Pretendard',sans-serif] font-normal">종합 프로필</span>
          </FloatingLabel>

          <div className="absolute left-[40px] top-[112px] flex gap-[30px]">
            <MetricCard
              title="TEMPERATURE"
              subtitle={`색온도: ${toneLabels[skinTone.temperature] || toneLabels[personalColor.temperature] || "네추럴"}`}
              percent={normalizeTemperature(metrics.temperature)}
              gradient="linear-gradient(90deg, #FFD23F 0%, #F6F1D5 48%, #0075FF 100%)"
            />
            <MetricCard
              title="VALUE"
              subtitle={`명도: ${toneLabels[personalColor.brightness] || toneLabels[skinTone.brightness] || "중간"}`}
              percent={normalizeBrightness(metrics.brightness)}
              gradient="linear-gradient(90deg, #050505 0%, #EFEFEF 100%)"
            />
            <MetricCard
              title="CHROMA"
              subtitle={`채도: ${toneLabels[personalColor.chroma] || toneLabels[skinTone.chroma] || "중간"}`}
              percent={normalizeSaturation(metrics.saturation)}
              gradient="linear-gradient(90deg, #9FA8A5 0%, #2FAE82 48%, #D72B68 100%)"
            />
          </div>
        </GlassPanel>
      </section>
    </motion.main>
  );
}
