import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import GlassButton from "./GlassButton.jsx";

const DESIGN_WIDTH = 1920;
const DESIGN_HEIGHT = 1080;

// 에셋 교체 위치: 실제 파일을 아래 경로에 넣으면 dev 서버에서 바로 재생/표시됩니다.
const openingVideoSrc = "/data/videos/intro.mp4";
const logoImageSrc = "/data/images/logo_white.png";
const buttonImageSrc = "/data/images/intro_button.png";

// 텍스트 수정 위치: 각 단계의 문구와 버튼 라벨은 여기에서 관리합니다.
const openingSteps = [
  {
    type: "logo",
    buttons: ["시작하기"],
  },
  {
    title: "Noir: 누아르 란?",
    description:
      "무지개멘션의 컨셉과 컬러웨이를 기반으로 하는\n가상의 무지개맨션 뮤즈를 뜻합니다.",
    buttons: ["다음"],
  },
  {
    title: "Noir: 누아르 란?",
    description:
      "전시 누아르에서, 관객은 자신의 메이크업 톤, 피부 톤을 분석받아\n가상의 환경에서 자유롭게 제품을 테스팅합니다.",
    buttons: ["다음"],
  },
  {
    title: "Noir: 누아르 란?",
    description:
      "테스팅을 마친 관객의 얼굴로써, 관객은 무지개맨션의 뮤즈,\n'누아르'로 거듭나는 제품들을 찾아가게 됩니다.",
    buttons: ["다음"],
  },
  {
    title: "지금 메이크업을 한 상태인가요?",
    buttons: ["네", "아니오"],
  },
  {
    title: "좋습니다, 그럼 촬영을 통해서\n얼굴의 전반적인 컬러를 분석해 볼게요.",
    buttons: ["얼굴 촬영하기"],
  },
];

const contentVariants = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

function renderTitle(title) {
  if (!title?.startsWith("Noir")) {
    return title;
  }

  return (
    <>
      <span className="font-cinzel-decorative font-normal">Noir</span>
      <span className="font-normal">: 누아르 란?</span>
    </>
  );
}

export default function OpeningScreen({ onFinish }) {
  const [step, setStep] = useState(0);
  const [sceneScale, setSceneScale] = useState(1);
  const [hasMakeup, setHasMakeup] = useState(false);
  const currentStep = openingSteps[step];

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

  const goNext = () => {
    setStep((current) => Math.min(current + 1, openingSteps.length - 1));
  };

  const handleChoice = (buttonIndex) => {
    if (step === 4) {
      setHasMakeup(buttonIndex === 0);
      goNext();
      return;
    }

    if (step === openingSteps.length - 1) {
      onFinish?.({ hasMakeup });
      return;
    }

    goNext();
  };

  return (
    <motion.main
      className="relative flex h-screen w-screen items-center justify-center overflow-hidden bg-black font-sans text-white"
      exit={{ opacity: 0 }}
      transition={{ duration: 0.55, ease: "easeOut" }}
    >
      <video
        className="absolute inset-0 h-full w-full object-cover"
        src={openingVideoSrc}
        autoPlay
        muted
        loop
        playsInline
        aria-hidden="true"
      />

      <section
        className="relative z-10 h-[1080px] w-[1920px] shrink-0 overflow-visible"
        style={{ transform: `scale(${sceneScale})` }}
      >
        <div className="absolute left-[606px] top-[540px] w-[620px] -translate-x-1/2 -translate-y-1/2 text-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              variants={contentVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.52, ease: "easeOut" }}
              className="w-full"
            >
              {currentStep.type === "logo" ? (
                <motion.img
                  src={logoImageSrc}
                  alt="MUZIGAE MANSION"
                  className="mx-auto h-[380px] w-[439.39px] object-contain"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, ease: "easeOut" }}
                />
              ) : (
                <div className="mx-auto w-[620px] text-center">
                  <h1
                    className={[
                      "whitespace-pre-line leading-[1.45] tracking-[-0.02em] text-white",
                      currentStep.description
                        ? "text-[24px] font-normal"
                        : "text-[20px] font-bold",
                    ].join(" ")}
                  >
                    {renderTitle(currentStep.title)}
                  </h1>
                  {currentStep.description && (
                    <p className="mt-[22px] whitespace-pre-line text-[20px] font-bold leading-[1.55] tracking-[-0.02em] text-white">
                      {currentStep.description}
                    </p>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55, delay: 0.12, ease: "easeOut" }}
          className="absolute left-[1320px] top-[540px] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-[22px]"
        >
          {currentStep.buttons.map((label, index) => (
            <GlassButton
              key={label}
              onClick={() => handleChoice(index)}
              backgroundImage={buttonImageSrc}
              className={label === "아니오" ? "text-white/80" : ""}
            >
              {label}
            </GlassButton>
          ))}
        </motion.div>
      </section>
    </motion.main>
  );
}
