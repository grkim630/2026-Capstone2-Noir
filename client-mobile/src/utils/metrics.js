const TEMPERATURE_BAR_MIN = -15;
const TEMPERATURE_BAR_MAX = 15;
const BRIGHTNESS_BAR_MID = 66;
const SATURATION_BAR_MAX = 66;

export const toneLabels = {
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

export const levelLabels = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

function clamp(value, min = 0, max = 100) {
  return Math.min(Math.max(value, min), max);
}

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

function normalizeSaturation(value) {
  if (!Number.isFinite(value)) {
    return 50;
  }

  const clamped = clamp(value, 0, SATURATION_BAR_MAX);
  return (clamped / SATURATION_BAR_MAX) * 100;
}

export function resolveMetricsFromRecommendation(recommendationResult) {
  const analysis = recommendationResult?.userAnalysis || {};
  const lab = analysis.skinLAB || {};
  const hsv = analysis.skinHSV || {};

  const temperature = Number.isFinite(lab.b) && Number.isFinite(lab.a) ? lab.b - lab.a : 0;
  const brightness = lab.L;
  const saturation = Number.isFinite(hsv.S) ? hsv.S * 100 : 50;

  return {
    temperature,
    brightness,
    saturation,
    temperaturePercent: normalizeTemperature(temperature),
    brightnessPercent: normalizeBrightness(brightness),
    saturationPercent: normalizeSaturation(saturation),
    temperatureLabel:
      toneLabels[analysis.temperature] || toneLabels.neutral,
    brightnessLabel:
      toneLabels[analysis.personalColorBrightness] ||
      toneLabels[analysis.brightness] ||
      toneLabels.medium,
    chromaLabel:
      toneLabels[analysis.personalColorChroma] ||
      toneLabels[analysis.chroma] ||
      toneLabels.medium,
    melanin: analysis.melanin || "medium",
    redness: analysis.redness || "medium",
  };
}
