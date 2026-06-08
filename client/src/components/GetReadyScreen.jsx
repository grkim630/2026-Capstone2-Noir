import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

const DESIGN_WIDTH = 1920;
const DESIGN_HEIGHT = 1080;

// 에셋 교체 위치: 실제 파일을 아래 경로에 넣으면 바로 적용됩니다.
const effectVideoSrc = "/data/videos/intro_effect.mp4";
const readyBackgroundSrc = "/data/images/background.png";
const readyLogoSrc = "/data/images/logo_red.png";
const readyNumberBoxSrc = "/data/images/getready_numbox.png";
const readyTextBoxSrc = "/data/images/getready_textbox.png";

const readyMessages = [
  "정면을 바라봐주세요.",
  "촬영이 시작되면\n2-3초간 눈을 깜빡이지 마세요.",
  "고개를 정지 시켜주세요.",
];

function getVisibleMessages(count) {
  if (count === 3) {
    return readyMessages.slice(0, 1);
  }

  if (count === 2) {
    return readyMessages.slice(0, 2);
  }

  return readyMessages;
}

export default function GetReadyScreen({ onComplete, skipEffect = false }) {
  const [sceneScale, setSceneScale] = useState(1);
  const [isEffectDone, setIsEffectDone] = useState(skipEffect);
  const [count, setCount] = useState(3);
  const visibleMessages = getVisibleMessages(count);

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
    if (!isEffectDone || count === 0) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setCount((current) => Math.max(current - 1, 0));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [count, isEffectDone]);

  useEffect(() => {
    if (!isEffectDone || count !== 0) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      onComplete?.();
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [count, isEffectDone, onComplete]);

  return (
    <motion.main
      className="relative flex h-screen w-screen items-center justify-center overflow-hidden bg-black font-sans"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.55, ease: "easeOut" }}
    >
      {!isEffectDone ? (
        <video
          className="absolute inset-0 h-full w-full object-cover"
          src={effectVideoSrc}
          autoPlay
          muted
          playsInline
          onEnded={() => setIsEffectDone(true)}
        />
      ) : (
        <img
          className="absolute inset-0 h-full w-full object-cover"
          src={readyBackgroundSrc}
          alt=""
          aria-hidden="true"
        />
      )}

      <AnimatePresence>
        {isEffectDone && (
          <motion.section
            className="relative z-10 h-[1080px] w-[1920px] shrink-0 overflow-visible"
            style={{ transform: `scale(${sceneScale})` }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
          >
            <img
              src={readyLogoSrc}
              alt="MUZIGAE MANSION"
              className="absolute left-[960px] top-[156px] h-[120px] w-[138.79px] -translate-x-1/2 -translate-y-1/2 object-contain"
            />

            <motion.div
              className="font-pretendard absolute left-[960px] top-[542px] flex h-[209px] w-[450px] -translate-x-1/2 -translate-y-1/2 items-center justify-center overflow-hidden rounded-[100px] border border-white/18 bg-white/[0.08] bg-cover bg-center bg-no-repeat text-[168px] font-bold leading-none text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.38),inset_0_-18px_38px_rgba(255,255,255,0.06),0_24px_80px_rgba(255,255,255,0.13),0_18px_70px_rgba(0,0,0,0.1)] backdrop-blur-md"
              style={{ backgroundImage: `url(${readyNumberBoxSrc})` }}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={count}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -18 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                >
                  {count}
                </motion.span>
              </AnimatePresence>
            </motion.div>

            <div className="absolute left-[1608px] top-[542px] flex w-[450px] -translate-x-1/2 -translate-y-1/2 flex-col gap-[20px]">
              {visibleMessages.map((message) => (
                <div
                  key={message}
                  className="font-pretendard flex h-[80px] w-[450px] items-center justify-start rounded-full border border-white/18 bg-white/[0.08] bg-cover bg-center bg-no-repeat py-0 pl-[74px] pr-[30px] text-left text-[20px] font-medium leading-[1.35] whitespace-pre-line text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.38),inset_0_-12px_26px_rgba(255,255,255,0.06),0_18px_60px_rgba(255,255,255,0.12),0_12px_44px_rgba(0,0,0,0.08)] backdrop-blur-md"
                  style={{ backgroundImage: `url(${readyTextBoxSrc})` }}
                >
                  {message}
                </div>
              ))}
            </div>

            <p className="font-pretendard absolute left-[960px] top-[930px] -translate-x-1/2 -translate-y-1/2 text-[24px] font-normal tracking-[-0.02em] text-black">
              곧 촬영이 시작됩니다
            </p>
          </motion.section>
        )}
      </AnimatePresence>
    </motion.main>
  );
}
