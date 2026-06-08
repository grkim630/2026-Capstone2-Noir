import { AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import AnalysisResultScreen from "../components/AnalysisResultScreen.jsx";
import RecommendationsScreen from "../components/RecommendationsScreen.jsx";
import TestingCompleteScreen from "../components/TestingCompleteScreen.jsx";
import AnalyzingScreen from "../components/AnalyzingScreen.jsx";
import CaptureCompleteScreen from "../components/CaptureCompleteScreen.jsx";
import GetReadyScreen from "../components/GetReadyScreen.jsx";
import OpeningScreen from "../components/OpeningScreen.jsx";
import CapturePage from "./CapturePage.jsx";
import { revokeCapturePreview } from "../utils/capturePreview.js";

let hasPrunedSessionsOnBoot = false;

export default function StartPage() {
  // const [phase, setPhase] = useState(import.meta.env.DEV ? "result" : "opening");
  const [phase, setPhase] = useState("opening");
  const [captureResult, setCaptureResult] = useState(null);
  const [shouldSkipReadyEffect, setShouldSkipReadyEffect] = useState(false);
  const [hasMakeup, setHasMakeup] = useState(false);

  useEffect(() => {
    if (hasPrunedSessionsOnBoot) {
      return;
    }

    hasPrunedSessionsOnBoot = true;
    fetch("/api/sessions/prune?keep=5", { method: "POST" }).catch((error) => {
      console.warn("[client] failed to prune old sessions", error);
    });
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#050000]">
    <AnimatePresence initial={false}>
      {phase === "opening" ? (
        <OpeningScreen
          key="opening"
          onFinish={({ hasMakeup: selectedHasMakeup = false } = {}) => {
            setHasMakeup(Boolean(selectedHasMakeup));
            setShouldSkipReadyEffect(false);
            setPhase("getReady");
          }}
        />
      ) : phase === "getReady" ? (
        <GetReadyScreen
          key={shouldSkipReadyEffect ? "get-ready-retake" : "get-ready"}
          skipEffect={shouldSkipReadyEffect}
          onComplete={() => setPhase("capture")}
        />
      ) : phase === "capture" ? (
        <CapturePage
          key="capture"
          onComplete={(result) => {
            revokeCapturePreview(captureResult?.frontImagePreview);
            setCaptureResult({
              ...result,
              hasMakeup,
            });
            setPhase("complete");
          }}
        />
      ) : phase === "complete" ? (
        <CaptureCompleteScreen
          key="complete"
          result={captureResult}
          onRetake={() => {
            revokeCapturePreview(captureResult?.frontImagePreview);
            setCaptureResult(null);
            setShouldSkipReadyEffect(true);
            setPhase("getReady");
          }}
          onAnalyzeStart={() => setPhase("analyzing")}
        />
      ) : phase === "analyzing" ? (
        <AnalyzingScreen
          key="analyzing"
          result={captureResult}
          onAnalysisComplete={(finalized) => {
            setCaptureResult((prev) => ({
              ...prev,
              ...finalized,
              frontImagePreview: prev?.frontImagePreview,
              captureFrames: prev?.captureFrames,
              hasMakeup: prev?.hasMakeup ?? false,
            }));
          }}
          onResultOpen={() => setPhase("result")}
        />
      ) : phase === "result" ? (
        <AnalysisResultScreen
          key="result"
          result={captureResult}
          onRecommend={() => setPhase("recommendations")}
        />
      ) : phase === "recommendations" ? (
        <RecommendationsScreen
          key="recommendations"
          result={captureResult}
          onGoToTesting={() => setPhase("testingComplete")}
        />
      ) : (
        <TestingCompleteScreen key="testingComplete" result={captureResult} />
      )}
    </AnimatePresence>
    </div>
  );
}
