import fallbackRecommendation from "../data/recommendation_result.json";
import { isUiOnlyMode } from "./devConfig.js";
import { resolveApiUrl } from "./serverConfig.js";

export const LOAD_SOURCES = {
  SESSION_API: "session-api",
  SESSION_STATIC: "session-static",
  LATEST_SESSION: "latest-session",
  LATEST_API: "latest-api",
  FALLBACK: "fallback",
};

const FETCH_TIMEOUT_MS = 5000;

function getSessionIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("session") || params.get("sessionId") || null;
}

async function fetchJson(url, { timeoutMs = FETCH_TIMEOUT_MS } = {}) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`${url} (${response.status})`);
    }
    return response.json();
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error(`${url} (timeout ${timeoutMs}ms)`);
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function trySessionRecommendationApi(sessionId) {
  return fetchJson(resolveApiUrl(`/api/capture/${encodeURIComponent(sessionId)}/recommendation`));
}

async function trySessionStaticFile(sessionId) {
  return fetchJson(
    resolveApiUrl(
      `/outputs/sessions/${encodeURIComponent(sessionId)}/recommendation_result.json`,
    ),
  );
}

async function tryLatestSessionRecommendation() {
  const data = await fetchJson(resolveApiUrl("/api/sessions/latest/recommendation"));
  if (!data?.recommendationResult) {
    throw new Error("latest session response missing recommendationResult");
  }
  return data;
}

async function tryLatestCapture() {
  const data = await fetchJson(resolveApiUrl("/api/capture/latest"), { timeoutMs: 15000 });
  if (!data?.recommendationResult) {
    throw new Error("latest capture response missing recommendationResult");
  }
  return data;
}

/**
 * 추천 데이터 로드 우선순위:
 * 1. URL ?session= / ?sessionId=
 * 2. /api/capture/{sessionId}/recommendation
 * 3. /outputs/sessions/{sessionId}/recommendation_result.json
 * 4. /api/sessions/latest/recommendation  ← outputs 최신 세션 폴더의 JSON (테스트/운영 공용)
 * 5. /api/capture/latest                  ← recommendation 없을 때 재생성
 * 6. 로컬 fallback JSON
 */
export async function loadRecommendationResult() {
  if (isUiOnlyMode()) {
    return {
      recommendationResult: fallbackRecommendation,
      sessionId: null,
      loadSource: LOAD_SOURCES.FALLBACK,
    };
  }

  const sessionFromUrl = getSessionIdFromUrl();
  const errors = [];

  if (sessionFromUrl) {
    try {
      const data = await trySessionRecommendationApi(sessionFromUrl);
      return {
        recommendationResult: data,
        sessionId: sessionFromUrl,
        loadSource: LOAD_SOURCES.SESSION_API,
      };
    } catch (error) {
      errors.push(`session API: ${error.message}`);
    }

    try {
      const data = await trySessionStaticFile(sessionFromUrl);
      return {
        recommendationResult: data,
        sessionId: sessionFromUrl,
        loadSource: LOAD_SOURCES.SESSION_STATIC,
      };
    } catch (error) {
      errors.push(`session static: ${error.message}`);
    }
  }

  try {
    const data = await tryLatestSessionRecommendation();
    return {
      recommendationResult: data.recommendationResult,
      sessionId: data.sessionId ?? null,
      loadSource: LOAD_SOURCES.LATEST_SESSION,
    };
  } catch (error) {
    errors.push(`latest session: ${error.message}`);
  }

  try {
    const data = await tryLatestCapture();
    return {
      recommendationResult: data.recommendationResult,
      sessionId: data.sessionId ?? null,
      loadSource: LOAD_SOURCES.LATEST_API,
    };
  } catch (error) {
    errors.push(`latest API: ${error.message}`);
  }

  return {
    recommendationResult: fallbackRecommendation,
    sessionId: sessionFromUrl,
    loadSource: LOAD_SOURCES.FALLBACK,
    error: errors.join(" | "),
  };
}

export function getLoadSourceLabel(loadSource, sessionId) {
  switch (loadSource) {
    case LOAD_SOURCES.SESSION_API:
      return `세션 API · ${sessionId}`;
    case LOAD_SOURCES.SESSION_STATIC:
      return `세션 파일 · ${sessionId}`;
    case LOAD_SOURCES.LATEST_SESSION:
      return sessionId ? `최신 저장 세션 · ${sessionId}` : "최신 저장 세션";
    case LOAD_SOURCES.LATEST_API:
      return sessionId ? `최신 촬영 세션 · ${sessionId}` : "최신 촬영 세션";
    case LOAD_SOURCES.FALLBACK:
      return "로컬 fallback";
    default:
      return "";
  }
}
