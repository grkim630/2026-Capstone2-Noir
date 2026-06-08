import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { runCaptureAnalysis } from "../api/captureApi.js";

const DESIGN_WIDTH = 1920;
const DESIGN_HEIGHT = 1080;

const backgroundSrc = "/data/images/background.png";
const lightBackgroundSrc = "/data/images/light_background.png";
const analyzingLogoBackSrc = "/data/images/analyzing_logoback.png";
const analyzingLogoSrc = "/data/images/analyzing_logo.png";
const smallLogoRedSrc = "/data/images/smalllogo_red.png";
const FLY_IN_DURATION_MS = 2000;
const INTRO_FADE_MS = 350;
const PANEL_EXPAND_MS = 900;
const ANALYSIS_STEP_INTERVAL_MS = 1500;
const ANALYSIS_COMPLETE_DELAY_MS = 800;
const MATCHING_STEP_HOLD_MS = 800;
const COMPLETE_HOLD_MS = 900;
const FLY_IN_DURATION = FLY_IN_DURATION_MS / 1000;
const PANEL_EXPAND_DURATION = PANEL_EXPAND_MS / 1000;
const ANALYZING_GLASS_SIZE_INTRO = 310;
const ANALYZING_GLASS_SIZE = 200;
const ANALYZING_LOGO_WIDTH = 150;
const ANALYZING_LOGO_HEIGHT = 45;
const ANALYZING_LOGO_INTRO_SCALE = ANALYZING_GLASS_SIZE_INTRO / ANALYZING_GLASS_SIZE;
const ANALYZING_LOGO_INTRO_WIDTH = ANALYZING_LOGO_WIDTH * ANALYZING_LOGO_INTRO_SCALE;
const ANALYZING_LOGO_INTRO_HEIGHT = ANALYZING_LOGO_HEIGHT * ANALYZING_LOGO_INTRO_SCALE;

const analysisSteps = [
  "얼굴 영역 감지",
  "피부 마스크 생성",
  "피부 색상 추출",
  "색공간 변환",
  "베이스 톤 분석",
  "컬러 판정 및 제품 매칭",
];

const MATCHING_STEP_INDEX = analysisSteps.length - 1;

function ProgressPill({ label, state, index }) {
  const isDone = state === "done";
  const isCurrent = state === "current";
  const colorClass = isDone ? "text-[#2EBB80]" : isCurrent ? "text-[#101010]" : "text-[#BFBFBF]";
  const indicatorClass = isDone ? "bg-[#2EBB80]" : isCurrent ? "bg-[#101010]" : "bg-[#BFBFBF]";
  const centerSpreadOffsets = [185, 111, 37, -37, -111, -185];

  return (
    <motion.div
      className="font-pretendard relative flex h-[58px] w-[450px] items-center justify-between overflow-hidden rounded-full border border-white/25 bg-white/[0.08] px-[28px] text-[20px] font-medium backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.38),inset_0_-10px_24px_rgba(255,255,255,0.06)]"
      initial={{ opacity: 0, y: centerSpreadOffsets[index], scaleY: 0.72 }}
      animate={{ opacity: 1, y: 0, scaleY: 1 }}
      transition={{
        duration: 0.62,
        delay: index * 0.06,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <motion.div
        className="absolute inset-x-0 top-0 bg-white/18"
        initial={{ height: "0%" }}
        animate={{ height: isDone || isCurrent ? "100%" : "0%" }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        aria-hidden="true"
      />
      <motion.span
        className={["relative z-10", colorClass].join(" ")}
        initial={false}
        animate={{ color: isDone ? "#2EBB80" : isCurrent ? "#101010" : "#BFBFBF" }}
        transition={{ duration: 0.45, ease: "easeOut" }}
      >
        {label}
      </motion.span>
      <motion.span
        className={["relative z-10 h-[15px] w-[40px] rounded-full", indicatorClass].join(" ")}
        initial={false}
        animate={{ backgroundColor: isDone ? "#2EBB80" : isCurrent ? "#101010" : "#BFBFBF" }}
        transition={{ duration: 0.45, ease: "easeOut" }}
      />
    </motion.div>
  );
}

function isCapturePipelineReady(result) {
  return Boolean(result?.finalResult && result?.recommendationResult);
}

export default function AnalyzingScreen({ result, onAnalysisComplete, onResultOpen }) {
  const hasRequestedAnalysisRef = useRef(false);
  const [sceneScale, setSceneScale] = useState(1);
  const [currentStep, setCurrentStep] = useState(-1);
  const [showIntroText, setShowIntroText] = useState(true);
  const [isPanelExpanded, setIsPanelExpanded] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [isCompleteCentered, setIsCompleteCentered] = useState(false);
  const [isAnimationReady, setIsAnimationReady] = useState(false);
  const [isAnalysisReady, setIsAnalysisReady] = useState(false);
  const [showResultButton, setShowResultButton] = useState(false);
  const [analysisError, setAnalysisError] = useState("");

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
    const timers = [];
    const stepsStartAt = FLY_IN_DURATION_MS + INTRO_FADE_MS + PANEL_EXPAND_MS;

    timers.push(window.setTimeout(() => setShowIntroText(false), FLY_IN_DURATION_MS));
    timers.push(
      window.setTimeout(() => setIsPanelExpanded(true), FLY_IN_DURATION_MS + INTRO_FADE_MS),
    );
    timers.push(window.setTimeout(() => setCurrentStep(1), stepsStartAt));

    for (let index = 2; index <= MATCHING_STEP_INDEX; index += 1) {
      timers.push(
        window.setTimeout(
          () => setCurrentStep(index),
          stepsStartAt + (index - 1) * ANALYSIS_STEP_INTERVAL_MS,
        ),
      );
    }

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, []);

  useEffect(() => {
    if (!isAnalysisReady) {
      return undefined;
    }
    if (currentStep < MATCHING_STEP_INDEX) {
      return undefined;
    }
    if (currentStep >= analysisSteps.length) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setCurrentStep(analysisSteps.length);
    }, MATCHING_STEP_HOLD_MS);

    return () => window.clearTimeout(timer);
  }, [isAnalysisReady, currentStep]);

  useEffect(() => {
    if (currentStep < analysisSteps.length) {
      return undefined;
    }

    const timers = [];
    timers.push(window.setTimeout(() => setIsComplete(true), ANALYSIS_COMPLETE_DELAY_MS));
    timers.push(
      window.setTimeout(
        () => setIsCompleteCentered(true),
        ANALYSIS_COMPLETE_DELAY_MS + COMPLETE_HOLD_MS,
      ),
    );
    timers.push(
      window.setTimeout(
        () => setIsAnimationReady(true),
        ANALYSIS_COMPLETE_DELAY_MS + COMPLETE_HOLD_MS + PANEL_EXPAND_MS,
      ),
    );

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [currentStep]);

  useEffect(() => {
    if (isCapturePipelineReady(result)) {
      setIsAnalysisReady(true);
      return undefined;
    }

    if (!result?.captureFrames?.length) {
      setAnalysisError("촬영 데이터가 없습니다. 처음부터 다시 촬영해주세요.");
      return undefined;
    }

    if (hasRequestedAnalysisRef.current) {
      return undefined;
    }

    hasRequestedAnalysisRef.current = true;

    (async () => {
      try {
        const finalized = await runCaptureAnalysis(
          result.captureFrames,
          result.sessionId || "",
          result.hasMakeup ?? false,
        );
        onAnalysisComplete?.(finalized);
        setIsAnalysisReady(true);
      } catch (error) {
        hasRequestedAnalysisRef.current = false;
        setAnalysisError(error.message || "분석 중 오류가 발생했습니다.");
      }
    })();
  }, [
    onAnalysisComplete,
    result?.captureFrames,
    result?.finalResult,
    result?.hasMakeup,
    result?.recommendationResult,
    result?.sessionId,
  ]);

  useEffect(() => {
    if (isAnimationReady && isAnalysisReady) {
      setShowResultButton(true);
    }
  }, [isAnimationReady, isAnalysisReady]);

  const currentLabel =
    currentStep >= analysisSteps.length
      ? analysisSteps[analysisSteps.length - 1]
      : analysisSteps[currentStep] || analysisSteps[0];
  const logoBackRotation = Math.max(currentStep, 0) * 60;
  const pipelineReady = isCapturePipelineReady(result);

  return (
    <motion.main
      className="relative flex h-screen w-screen items-center justify-center overflow-hidden bg-black font-sans"
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
      <motion.img
        className="absolute inset-0 h-full w-full object-cover"
        src={lightBackgroundSrc}
        alt=""
        aria-hidden="true"
        initial={{ opacity: 0 }}
        animate={{ opacity: isCompleteCentered ? 1 : 0 }}
        transition={{ duration: PANEL_EXPAND_DURATION, ease: [0.22, 1, 0.36, 1] }}
      />

      <section
        className="relative z-10 h-[1080px] w-[1920px] shrink-0 overflow-visible"
        style={{ transform: `scale(${sceneScale})` }}
      >
        <AnimatePresence mode="wait">
          {isCompleteCentered ? (
            <motion.img
              key="small-logo-red"
              src={smallLogoRedSrc}
              alt="NOIR"
              className="absolute left-[960px] top-[58px] h-[45px] w-[150px] -translate-x-1/2 object-contain"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
            />
          ) : (
            <motion.p
              key="waiting-text"
              className="font-pretendard absolute left-[960px] top-[88px] -translate-x-1/2 text-[16px] font-normal tracking-[-0.02em] text-[#101010]"
              initial={{ opacity: 1 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
            >
              잠시만 기다려주세요
            </motion.p>
          )}
        </AnimatePresence>

        <motion.div
          className="absolute rounded-[50%] bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.28)_0%,rgba(0,0,0,0.16)_42%,rgba(0,0,0,0)_72%)] blur-[20px]"
          initial={{ left: 960 - 477 / 2, top: 1010 - 118 / 2, width: 477, height: 118 }}
          animate={{ left: 960 - 286 / 2, top: 930 - 62 / 2, width: 286, height: 62 }}
          transition={{ duration: FLY_IN_DURATION, ease: [0.22, 1, 0.36, 1] }}
          aria-hidden="true"
        />

        <motion.img
          src={analyzingLogoBackSrc}
          alt=""
          className="absolute object-contain"
          initial={{ left: 960 - 431 / 2, top: 540 - 421 / 2, width: 431, height: 421 }}
          animate={{
            left: 960 - 256 / 2,
            top: 540 - 250 / 2,
            width: 256,
            height: 250,
            rotate: logoBackRotation,
          }}
          transition={{
            left: { duration: FLY_IN_DURATION, ease: [0.22, 1, 0.36, 1] },
            top: { duration: FLY_IN_DURATION, ease: [0.22, 1, 0.36, 1] },
            width: { duration: FLY_IN_DURATION, ease: [0.22, 1, 0.36, 1] },
            height: { duration: FLY_IN_DURATION, ease: [0.22, 1, 0.36, 1] },
            rotate: { duration: 0.65, ease: [0.22, 1, 0.36, 1] },
          }}
          aria-hidden="true"
        />

        <motion.div
          className="absolute z-[1]"
          initial={{ left: 720 - ANALYZING_GLASS_SIZE_INTRO / 2, top: 650 - ANALYZING_GLASS_SIZE_INTRO / 2, width: ANALYZING_GLASS_SIZE_INTRO, height: ANALYZING_GLASS_SIZE_INTRO }}
          animate={{ left: 960 - ANALYZING_GLASS_SIZE / 2, top: 540 - ANALYZING_GLASS_SIZE / 2, width: ANALYZING_GLASS_SIZE, height: ANALYZING_GLASS_SIZE }}
          transition={{ duration: FLY_IN_DURATION, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="analyzing-logo-glass absolute inset-0" aria-hidden="true" />
          <motion.img
            src={analyzingLogoSrc}
            alt="NOIR"
            className="analyzing-logo-image absolute left-1/2 top-1/2 z-[1] -translate-x-1/2 -translate-y-1/2 object-contain"
            initial={{ width: ANALYZING_LOGO_INTRO_WIDTH, height: ANALYZING_LOGO_INTRO_HEIGHT }}
            animate={{ width: ANALYZING_LOGO_WIDTH, height: ANALYZING_LOGO_HEIGHT }}
            transition={{ duration: FLY_IN_DURATION, ease: [0.22, 1, 0.36, 1] }}
          />
        </motion.div>

        <motion.div
          className="absolute z-[10] overflow-hidden rounded-[50px] border border-white/22 bg-white/[0.08] backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.4),inset_0_-14px_34px_rgba(255,255,255,0.06),0_22px_70px_rgba(0,0,0,0.08)]"
          initial={{ left: 1070, top: 500, width: 450, height: 80 }}
          animate={
            isCompleteCentered
              ? { left: 960 - 500 / 2, top: 540 - 130 / 2, width: 500, height: 130 }
              : isComplete
                ? { left: 1220, top: 465, width: 500, height: 130 }
                : isPanelExpanded
                  ? { left: 1220, top: 245, width: 500, height: 560 }
                  : { left: 1220, top: 500, width: 450, height: 80 }
          }
          transition={{
            duration: isPanelExpanded || isComplete ? PANEL_EXPAND_DURATION : FLY_IN_DURATION,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          <AnimatePresence mode="wait">
            {isComplete ? (
              <motion.div
                key="complete"
                className="flex h-full w-full items-center justify-center"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
              >
                <AnimatePresence mode="wait">
                  {showResultButton ? (
                    <motion.button
                      key="result-button"
                      type="button"
                      onClick={() => {
                        if (pipelineReady) {
                          onResultOpen?.();
                        }
                      }}
                      disabled={!pipelineReady}
                      whileHover={{ scale: 1.02, backgroundColor: "rgba(255,255,255,0.14)" }}
                      whileTap={{ scale: 0.98 }}
                      className="font-pretendard relative flex h-[80px] w-[450px] items-center justify-center rounded-full border border-white/25 bg-white/[0.08] px-[28px] backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.38),inset_0_-10px_24px_rgba(255,255,255,0.06)] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.32, ease: "easeOut" }}
                    >
                      <span className="intro-button-text relative z-10 bg-gradient-to-b from-[#851414] to-[#570d0d] bg-clip-text text-transparent">
                        분석 결과 확인하기
                      </span>
                    </motion.button>
                  ) : (
                    <motion.div
                      key="complete-pill"
                      className="font-pretendard flex h-[80px] w-[450px] items-center justify-between rounded-full border border-white/25 bg-white/[0.08] px-[28px] text-[20px] font-bold text-white backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.38),inset_0_-10px_24px_rgba(255,255,255,0.06)]"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.32, ease: "easeOut" }}
                    >
                      <span>분석완료</span>
                      <span className="h-[15px] w-[40px] rounded-full bg-white" aria-hidden="true" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ) : showIntroText ? (
              <motion.div
                key="intro"
                className="font-pretendard flex h-full w-full items-center justify-center text-[24px] font-bold text-white"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.32, ease: "easeOut" }}
              >
                분석을 시작합니다...
              </motion.div>
            ) : currentStep < 0 ? (
              <motion.div
                key="empty"
                className="h-full w-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0 }}
                exit={{ opacity: 0 }}
              />
            ) : (
              <motion.div
                key="steps"
                className="flex h-full w-full flex-col items-center px-[25px] pt-[28px]"
                initial={{ opacity: 1 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.28, ease: "easeOut" }}
              >
                <div className="flex flex-col gap-[16px]">
                  {analysisSteps.map((step, index) => (
                    <ProgressPill
                      key={step}
                      label={step}
                      index={index}
                      state={
                        index < currentStep ? "done" : index === currentStep ? "current" : "waiting"
                      }
                    />
                  ))}
                </div>

                <p className="mt-[28px] w-[450px] text-left font-['Inter','Pretendard',sans-serif] text-[36px] font-semibold tracking-[-0.02em] text-white">
                  {currentLabel} 중...
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </section>

      {analysisError && (
        <div className="font-pretendard absolute inset-x-0 bottom-16 z-20 mx-auto max-w-xl rounded-2xl bg-red-600/85 px-6 py-4 text-center text-[18px] text-white">
          {analysisError}
        </div>
      )}
    </motion.main>
  );
}
