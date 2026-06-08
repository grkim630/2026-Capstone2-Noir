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
