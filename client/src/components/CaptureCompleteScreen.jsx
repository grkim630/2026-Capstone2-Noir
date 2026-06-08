import { motion } from "framer-motion";
import { useEffect, useState } from "react";

const DESIGN_WIDTH = 1920;
const DESIGN_HEIGHT = 1080;

const completeBackgroundSrc = "/data/images/background.png";
const completeLogoSrc = "/data/images/logo_red.png";

function CompleteGlassButton({ children, className = "", ...props }) {
  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.02, backgroundColor: "rgba(255,255,255,0.14)" }}
      whileTap={{ scale: 0.98 }}
      className={[
        "font-pretendard relative flex h-[80px] w-[450px] items-center justify-center overflow-hidden rounded-full border border-white/18 bg-white/[0.08]",
        "bg-cover bg-center bg-no-repeat text-white backdrop-blur-md transition-colors duration-300",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.38),inset_0_-12px_26px_rgba(255,255,255,0.06),0_18px_60px_rgba(255,255,255,0.12),0_12px_44px_rgba(0,0,0,0.08)]",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
        className,
      ].join(" ")}
      {...props}
    >
      <span className="intro-button-text relative z-10">{children}</span>
    </motion.button>
  );
}

export default function CaptureCompleteScreen({ result, onRetake, onAnalyzeStart }) {
  const [sceneScale, setSceneScale] = useState(1);

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
        src={completeBackgroundSrc}
        alt=""
        aria-hidden="true"
      />

      <section
        className="relative z-10 h-[1080px] w-[1920px] shrink-0 overflow-visible"
        style={{ transform: `scale(${sceneScale})` }}
      >
        <img
          src={completeLogoSrc}
          alt="MUZIGAE MANSION"
          className="absolute left-[960px] top-[156px] h-[120px] w-[138.79px] -translate-x-1/2 -translate-y-1/2 object-contain"
        />

        <div className="absolute left-[960px] top-[542px] flex -translate-x-1/2 -translate-y-1/2 items-center gap-[48px]">
          <CompleteGlassButton onClick={onRetake}>
            다시 촬영하기
          </CompleteGlassButton>

          {(result?.frontImagePreview || result?.frontImage) && (
            <img
              src={result.frontImagePreview || result.frontImage}
              alt="촬영 대표 이미지"
              className="h-[270px] w-[480px] shrink-0 rounded-lg object-cover"
            />
          )}

          <CompleteGlassButton onClick={onAnalyzeStart}>
            <span className="flex items-center justify-center gap-[22px]">
              <span className="block h-[3px] w-[50px] bg-white" aria-hidden="true" />
              <span>분석 시작하기</span>
              <span className="relative block h-[3px] w-[62px] bg-white" aria-hidden="true">
                <span className="absolute right-0 top-1/2 h-[10px] w-[10px] -translate-y-1/2 rotate-45 border-r-3 border-t-3 border-white" />
              </span>
            </span>
          </CompleteGlassButton>
        </div>

        <p className="font-pretendard absolute left-[960px] top-[930px] -translate-x-1/2 -translate-y-1/2 bg-gradient-to-b from-[#851414] to-[#570d0d] bg-clip-text text-[24px] font-normal tracking-[-0.02em] text-transparent">
          촬영이 완료되었습니다.
        </p>
      </section>
    </motion.main>
  );
}
