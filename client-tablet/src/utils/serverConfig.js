/**
 * 서버/API/WebSocket 접속 설정.
 *
 * 태블릿(Fully Kiosk)에서는 localhost를 쓸 수 없으므로
 * VITE_SERVER_ORIGIN에 서버 PC LAN IP를 지정한다.
 *
 * 예: VITE_SERVER_ORIGIN=http://192.168.0.10:8000
 *
 * 미설정 시 현재 페이지 origin + Vite dev proxy 사용 (PC 로컬 개발용).
 */

function trimTrailingSlash(value) {
  return String(value || "").replace(/\/+$/, "");
}

export function getServerOrigin() {
  const configured = trimTrailingSlash(import.meta.env.VITE_SERVER_ORIGIN);
  if (configured) {
    return configured;
  }
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "";
}

export function resolveApiUrl(path) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const origin = getServerOrigin();
  return `${origin}${normalizedPath}`;
}

export function getSocketConnectOptions() {
  const configuredOrigin = trimTrailingSlash(import.meta.env.VITE_SERVER_ORIGIN);

  return {
    url: configuredOrigin || undefined,
    options: {
      path: "/socket.io",
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      timeout: 10000,
    },
  };
}
