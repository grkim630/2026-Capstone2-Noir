import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

const CAPTURE_MIME_TYPE = "image/jpeg";
const CAPTURE_QUALITY = 0.92;
const PREFERRED_CAMERA_KEYWORDS = ["c922", "pro stream webcam", "logitech"];

const HIGH_RES_VIDEO_CONSTRAINTS = {
  width: { ideal: 1920, min: 1280 },
  height: { ideal: 1080, min: 720 },
  frameRate: { ideal: 30, max: 30 },
};

function buildVideoConstraints(deviceId) {
  if (deviceId) {
    return {
      deviceId: { exact: deviceId },
      ...HIGH_RES_VIDEO_CONSTRAINTS,
    };
  }

  return {
    facingMode: "user",
    ...HIGH_RES_VIDEO_CONSTRAINTS,
  };
}

async function applyPreferredResolution(track) {
  if (!track?.applyConstraints) {
    return;
  }

  try {
    await track.applyConstraints({
      width: { ideal: 1920, min: 1280 },
      height: { ideal: 1080, min: 720 },
      frameRate: { ideal: 30, max: 30 },
    });
  } catch {
    try {
      await track.applyConstraints({
        width: { ideal: 1280, min: 640 },
        height: { ideal: 720, min: 480 },
      });
    } catch {
      // Keep the negotiated stream resolution if the device rejects upgrades.
    }
  }
}

function findPreferredCamera(cameras) {
  return cameras.find((device) => {
    const label = device.label.toLowerCase();
    return PREFERRED_CAMERA_KEYWORDS.some((keyword) => label.includes(keyword));
  });
}

function WebcamCapture({ onReady, className = "", showCameraInfo = false }, ref) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [error, setError] = useState("");
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [activeDeviceLabel, setActiveDeviceLabel] = useState("");
  const [captureSize, setCaptureSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    let isMounted = true;

    async function startCamera() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("이 브라우저에서는 웹캠 API를 사용할 수 없습니다.");
        }

        streamRef.current?.getTracks().forEach((track) => track.stop());
        setError("");

        let stream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: buildVideoConstraints(selectedDeviceId),
            audio: false,
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({
            video: selectedDeviceId
              ? { deviceId: { exact: selectedDeviceId } }
              : { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: false,
          });
        }

        const videoDevices = await navigator.mediaDevices.enumerateDevices();
        const cameras = videoDevices.filter((device) => device.kind === "videoinput");
        const preferredCamera = findPreferredCamera(cameras);
        const currentDeviceId = stream.getVideoTracks()[0]?.getSettings().deviceId;

        if (
          !selectedDeviceId &&
          preferredCamera?.deviceId &&
          preferredCamera.deviceId !== currentDeviceId
        ) {
          stream.getTracks().forEach((track) => track.stop());
          stream = await navigator.mediaDevices.getUserMedia({
            video: buildVideoConstraints(preferredCamera.deviceId),
            audio: false,
          });
          setSelectedDeviceId(preferredCamera.deviceId);
        }

        const track = stream.getVideoTracks()[0];
        await applyPreferredResolution(track);

        if (!isMounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current;
        video.srcObject = stream;
        video.onloadedmetadata = () => {
          if (!isMounted) {
            return;
          }
          setCaptureSize({
            width: video.videoWidth,
            height: video.videoHeight,
          });
        };
        await video.play();

        const settings = track?.getSettings?.() || {};
        setCaptureSize({
          width: settings.width || video.videoWidth || 0,
          height: settings.height || video.videoHeight || 0,
        });

        const activeLabel = track?.label || "선택된 카메라";
        setDevices(cameras);
        setActiveDeviceLabel(activeLabel);
        onReady?.();
      } catch (cameraError) {
        setError(
          `${cameraError.name || "CameraError"}: ${
            cameraError.message || "웹캠을 열 수 없습니다."
          }`,
        );
      }
    }

    startCamera();

    return () => {
      isMounted = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [onReady, selectedDeviceId]);

  useImperativeHandle(ref, () => ({
    getVideoElement() {
      return videoRef.current;
    },
    captureFrame() {
      const video = videoRef.current;
      if (!video || !video.videoWidth || !video.videoHeight) {
        return Promise.resolve(null);
      }

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext("2d");
      context.translate(canvas.width, 0);
      context.scale(-1, 1);
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      return new Promise((resolve) => {
        canvas.toBlob(
          (blob) => resolve(blob),
          CAPTURE_MIME_TYPE,
          CAPTURE_QUALITY,
        );
      });
    },
  }));

  return (
    <div className={["relative h-full w-full overflow-hidden bg-black", className].join(" ")}>
      <video
        ref={videoRef}
        className="h-full w-full scale-x-[-1] object-cover"
        muted
        playsInline
      />
      {showCameraInfo && (
        <div className="absolute left-6 top-32 z-30 max-w-md rounded-2xl border border-white/20 bg-black/45 p-4 text-sm text-white backdrop-blur-md">
          <p className="font-bold">현재 카메라</p>
          <p className="mt-1 text-white/75">{activeDeviceLabel || "카메라 연결 확인 중"}</p>
          {captureSize.width > 0 && (
            <p className="mt-1 text-white/60">
              촬영 해상도: {captureSize.width}×{captureSize.height}
            </p>
          )}
          {devices.length > 0 && (
            <select
              className="mt-3 w-full rounded-lg bg-black/70 px-3 py-2 text-white outline-none"
              value={selectedDeviceId}
              onChange={(event) => setSelectedDeviceId(event.target.value)}
            >
              <option value="">기본 카메라</option>
              {devices.map((device, index) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `카메라 ${index + 1}`}
                </option>
              ))}
            </select>
          )}
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 px-8 text-center text-white">
          {error}
        </div>
      )}
    </div>
  );
}

export default forwardRef(WebcamCapture);
