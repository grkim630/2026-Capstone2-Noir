export async function uploadPoseFrames({ pose, sessionId, frames, hasMakeup = false }) {
  const formData = new FormData();
  formData.append("pose", pose);
  formData.append("hasMakeup", String(Boolean(hasMakeup)));
  if (sessionId) {
    formData.append("sessionId", sessionId);
  }
  frames.forEach((frame, index) => {
    formData.append("frames", frame, `${pose}_${index.toString().padStart(3, "0")}.jpg`);
  });

  const response = await fetch("/api/capture/analyze", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || "프레임 분석에 실패했습니다.");
  }

  return response.json();
}

export async function finalizeCapture(sessionId) {
  const response = await fetch("/api/capture/finalize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || "최종 결과 저장에 실패했습니다.");
  }

  return response.json();
}

/**
 * 정면 프레임 업로드 → 얼굴 분석 → final_result.json → recommendation_result.json
 * (추천 생성은 서버 finalize에서 얼굴 분석 직후 동기 실행)
 */
export async function runCaptureAnalysis(frames, sessionId = "", hasMakeup = false) {
  const uploadResult = await uploadPoseFrames({
    pose: "front",
    sessionId,
    frames,
    hasMakeup,
  });
  return finalizeCapture(uploadResult.sessionId);
}

export async function fetchSessionRecommendation(sessionId) {
  const response = await fetch(`/api/capture/${sessionId}/recommendation`);
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || "추천 결과를 불러오지 못했습니다.");
  }
  return response.json();
}
