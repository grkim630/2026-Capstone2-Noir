import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { useCallback, useEffect, useRef, useState } from "react";
import WebcamCapture from "../components/WebcamCapture.jsx";
import { createRepresentativePreview } from "../utils/capturePreview.js";
import { playAudio, stopActiveAudio, trackAudio } from "../utils/playAudio.js";

const ttsVoice1Src = "/data/audios/tts_voice1.mp3";
const ttsVoice2Src = "/data/audios/tts_voice2.mp3";
const ttsVoice3Src = "/data/audios/tts_voice3.mp3";
const ttsVoice4Src = "/data/audios/tts_voice4.mp3";
const ttsVoice5Src = "/data/audios/tts_voice5.mp3";

const COUNTDOWN_STEPS = [
  { number: 1, audioSrc: ttsVoice2Src },
  { number: 2, audioSrc: ttsVoice3Src },
  { number: 3, audioSrc: ttsVoice4Src },
];

const FRONT_POSE = {
  id: "front",
  label: "정면을 바라봐주세요",
  guideline: "/data/images/guideline_front.png",
  guidelineWidth: 597,
  guidelineHeight: 750,
  guidelineClassName: "h-[750px] w-[597px]",
};

const DESIGN_WIDTH = 1920;
const DESIGN_HEIGHT = 1080;
const GUIDELINE_CENTER = { x: 960, y: 600 };
const CAPTURE_FPS = 12;
const ALIGNMENT_CHECK_INTERVAL_MS = 140;
const ALIGNMENT_HOLD_MS = 700;
const cameraTextBoxSrc = "/data/images/camera_textbox.png";
const guideMessages = [
  "정면을 바라봐주세요.",
  "가이드라인에 얼굴이 맞춰지면\n자동으로 촬영이 진행됩니다.",
  "촬영은 삐 소리 이후 3초 간 진행돼요.",
  "삐 소리 이후 3초 동안\n고개를 정지해주세요.",
];

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function createFaceLandmarker() {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm",
  );

  return FaceLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task",
      delegate: "GPU",
    },
    numFaces: 1,
    runningMode: "VIDEO",
  });
}

function getGuidelineRect(pose, sceneScale) {
  const canvasWidth = DESIGN_WIDTH * sceneScale;
  const canvasHeight = DESIGN_HEIGHT * sceneScale;
  const canvasLeft = (window.innerWidth - canvasWidth) / 2;
  const canvasTop = (window.innerHeight - canvasHeight) / 2;
  const width = pose.guidelineWidth * sceneScale;
  const height = pose.guidelineHeight * sceneScale;
  const centerX = canvasLeft + GUIDELINE_CENTER.x * sceneScale;
  const centerY = canvasTop + GUIDELINE_CENTER.y * sceneScale;

  return {
    x: centerX - width / 2,
    y: centerY - height / 2,
    width,
    height,
    centerX,
    centerY,
  };
}

function landmarkToViewportPoint(landmark, video) {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const videoScale = Math.max(
    viewportWidth / video.videoWidth,
    viewportHeight / video.videoHeight,
  );
  const renderedWidth = video.videoWidth * videoScale;
  const renderedHeight = video.videoHeight * videoScale;
  const offsetX = (viewportWidth - renderedWidth) / 2;
  const offsetY = (viewportHeight - renderedHeight) / 2;
  const rawX = offsetX + landmark.x * renderedWidth;

  return {
    // The preview is mirrored with CSS, so compare against the mirrored display coordinates.
    x: viewportWidth - rawX,
    y: offsetY + landmark.y * renderedHeight,
  };
}

function getFaceRect(landmarks, video) {
  const points = landmarks.map((landmark) => landmarkToViewportPoint(landmark, video));
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  const width = Math.max(...xs) - x;
  const height = Math.max(...ys) - y;

  return {
    x,
    y,
    width,
    height,
    centerX: x + width / 2,
    centerY: y + height / 2,
    points,
  };
}

function evaluateFaceAlignment({ landmarks, pose, sceneScale, video }) {
  if (!landmarks) {
    return { isAligned: false, message: "얼굴을 가이드라인 안에 맞춰주세요." };
  }

  const guideline = getGuidelineRect(pose, sceneScale);
  const face = getFaceRect(landmarks, video);
  const nose = landmarkToViewportPoint(landmarks[1], video);
  const noseOffsetRatio = (nose.x - face.centerX) / face.width;

  const centerOffsetX = Math.abs(face.centerX - guideline.centerX);
  const centerOffsetY = Math.abs(face.centerY - guideline.centerY);
  const centerOk =
    centerOffsetX <= guideline.width * 0.22 &&
    centerOffsetY <= guideline.height * 0.22;
  const heightRatio = face.height / guideline.height;
  const widthRatio = face.width / guideline.width;
  const sizeOk = heightRatio >= 0.32 && heightRatio <= 0.88 && widthRatio <= 1.05;

  const frontOk = Math.abs(noseOffsetRatio) <= 0.18;

  if (!centerOk) {
    return { isAligned: false, message: "얼굴을 가이드라인 중앙에 맞춰주세요." };
  }

  if (!sizeOk) {
    return { isAligned: false, message: "얼굴 크기를 가이드라인에 맞춰주세요." };
  }

  if (!frontOk) {
    return { isAligned: false, message: pose.label };
  }

  return { isAligned: true, message: "좋습니다. 촬영을 시작합니다." };
}

export default function CapturePage({ onComplete }) {
  const webcamRef = useRef(null);
  const hasStartedRef = useRef(false);
  const faceLandmarkerRef = useRef(null);
  const alignmentRunIdRef = useRef(0);
  const [sceneScale, setSceneScale] = useState(1);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isLandmarkerReady, setIsLandmarkerReady] = useState(false);
  const [captureNumber, setCaptureNumber] = useState(null);
  const [status, setStatus] = useState("웹캠을 준비하고 있습니다.");
  const [error, setError] = useState("");

  const handleCameraReady = useCallback(() => {
    setIsCameraReady(true);
  }, []);

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
    let isMounted = true;

    async function loadFaceLandmarker() {
      try {
        setStatus("얼굴 인식 모델을 준비하고 있습니다.");
        faceLandmarkerRef.current = await createFaceLandmarker();
        if (isMounted) {
          setIsLandmarkerReady(true);
          setStatus("가이드라인에 얼굴을 맞춰주세요.");
        }
      } catch (landmarkerError) {
        setError(landmarkerError.message || "얼굴 인식 모델을 불러오지 못했습니다.");
      }
    }

    loadFaceLandmarker();

    return () => {
      isMounted = false;
      alignmentRunIdRef.current += 1;
      faceLandmarkerRef.current?.close();
      stopActiveAudio();
    };
  }, []);

  const captureFramesWhileAudio = useCallback(async (audioSrc) => {
    stopActiveAudio();

    const audio = new Audio(audioSrc);
    trackAudio(audio);

    await new Promise((resolve) => {
      audio.addEventListener("loadedmetadata", resolve, { once: true });
      audio.addEventListener("error", resolve, { once: true });
      audio.load();
    });

    const durationMs = Math.max((audio.duration || 1) * 1000, 500);
    const intervalMs = durationMs / CAPTURE_FPS;
    const frames = [];

    try {
      await audio.play();
    } catch {
      /* 재생 실패 시에도 캡처는 진행 */
    }

    for (let index = 0; index < CAPTURE_FPS; index += 1) {
      const blob = await webcamRef.current?.captureFrame();
      if (blob) {
        frames.push(blob);
      }
      if (index < CAPTURE_FPS - 1) {
        await wait(intervalMs);
      }
    }

    await new Promise((resolve) => {
      if (audio.ended) {
        resolve();
        return;
      }
      audio.addEventListener("ended", resolve, { once: true });
      audio.addEventListener("error", resolve, { once: true });
    });

    stopActiveAudio();

    return frames;
  }, []);

  const captureFramesForPose = useCallback(async () => {
    const frames = [];

    for (const step of COUNTDOWN_STEPS) {
      setCaptureNumber(step.number);
      const stepFrames = await captureFramesWhileAudio(step.audioSrc);
      frames.push(...stepFrames);
    }

    setCaptureNumber(null);
    return frames;
  }, [captureFramesWhileAudio]);

  const waitForFaceAlignment = useCallback(
    (pose) =>
      new Promise((resolve, reject) => {
        const faceLandmarker = faceLandmarkerRef.current;
        const video = webcamRef.current?.getVideoElement();

        if (!faceLandmarker || !video) {
          reject(new Error("얼굴 인식 또는 웹캠이 아직 준비되지 않았습니다."));
          return;
        }

        const runId = alignmentRunIdRef.current + 1;
        alignmentRunIdRef.current = runId;
        let alignedSince = null;

        const checkAlignment = () => {
          if (alignmentRunIdRef.current !== runId) {
            return;
          }

          if (!video.videoWidth || !video.videoHeight) {
            window.setTimeout(checkAlignment, ALIGNMENT_CHECK_INTERVAL_MS);
            return;
          }

          const detection = faceLandmarker.detectForVideo(video, performance.now());
          const landmarks = detection.faceLandmarks?.[0];
          const alignment = evaluateFaceAlignment({
            landmarks,
            pose,
            sceneScale,
            video,
          });

          setStatus(alignment.message);

          if (alignment.isAligned) {
            alignedSince ??= performance.now();
            if (performance.now() - alignedSince >= ALIGNMENT_HOLD_MS) {
              resolve();
              return;
            }
          } else {
            alignedSince = null;
          }

          window.setTimeout(checkAlignment, ALIGNMENT_CHECK_INTERVAL_MS);
        };

        checkAlignment();
      }),
    [sceneScale],
  );

  const runCaptureSequence = useCallback(async () => {
    if (hasStartedRef.current || !isCameraReady || !isLandmarkerReady) {
      return;
    }

    hasStartedRef.current = true;

    try {
      const pose = FRONT_POSE;
      setStatus("안내 음성을 재생하고 있습니다.");
      await playAudio(ttsVoice1Src);
      await playAudio(ttsVoice5Src);
      setStatus(`${pose.label} 가이드라인에 얼굴을 맞춰주세요.`);
      await waitForFaceAlignment(pose);
      setStatus(`${pose.label} 촬영 중입니다.`);
      const frames = await captureFramesForPose();
      const frontImagePreview = createRepresentativePreview(frames);

      onComplete?.({
        frontImagePreview,
        captureFrames: frames,
      });
    } catch (captureError) {
      setError(captureError.message || "촬영 중 오류가 발생했습니다.");
      setStatus("촬영을 다시 시도해주세요.");
    }
  }, [captureFramesForPose, isCameraReady, isLandmarkerReady, onComplete, waitForFaceAlignment]);

  useEffect(() => {
    runCaptureSequence();
  }, [runCaptureSequence]);

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-black font-pretendard text-white">
      <WebcamCapture ref={webcamRef} onReady={handleCameraReady} />

      <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
        <section
          className="relative h-[1080px] w-[1920px] shrink-0"
          style={{ transform: `scale(${sceneScale})` }}
        >
          <p className="font-pretendard absolute left-[960px] top-[68px] -translate-x-1/2 text-center text-[32px] font-bold tracking-[-0.02em] text-[#2EBB80]">
            가이드라인에 얼굴을 최대한 맞춰주세요
          </p>

          <div className="absolute left-[960px] top-[600px] -translate-x-1/2 -translate-y-1/2">
            <img
              src={FRONT_POSE.guideline}
              alt=""
              className={[FRONT_POSE.guidelineClassName, "object-contain"].join(" ")}
              aria-hidden="true"
            />
            {captureNumber && (
              <p className="font-pretendard absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[168px] font-bold leading-none text-[#2EBB80]">
                {captureNumber}
              </p>
            )}
          </div>

          <div className="absolute left-[1608px] top-[542px] flex w-[450px] -translate-x-1/2 -translate-y-1/2 flex-col gap-[20px]">
            {guideMessages.map((message) => (
              <div
                key={message}
                className="font-pretendard flex h-[80px] w-[450px] items-center justify-start bg-cover bg-center bg-no-repeat py-0 pl-[74px] pr-[30px] text-left text-[20px] font-medium leading-[1.35] whitespace-pre-line text-[#101010]"
                style={{ backgroundImage: `url(${cameraTextBoxSrc})` }}
              >
                {message}
              </div>
            ))}
          </div>
        </section>
      </div>

      {error && (
        <div className="absolute inset-x-0 bottom-24 z-20 mx-auto max-w-xl rounded-2xl bg-red-600/85 px-6 py-4 text-center text-white">
          {error}
        </div>
      )}
    </main>
  );
}
