/**
 * Tablet runtime flags.
 * - VITE_TABLET_SOCKET_ENABLED=false disables Socket.IO.
 * - VITE_TABLET_UI_ONLY=true skips API loading and uses local fallback data.
 * URL overrides: ?uiOnly=1 or ?noSocket=1.
 */

function readBoolEnv(value, defaultValue) {
  if (value === undefined || value === "") {
    return defaultValue;
  }
  return value === "true" || value === "1";
}

function readUrlFlag(...keys) {
  if (typeof window === "undefined") {
    return false;
  }
  const params = new URLSearchParams(window.location.search);
  return keys.some((key) => params.get(key) === "1" || params.get(key) === "true");
}

export function isSocketEnabled() {
  if (readUrlFlag("noSocket")) {
    return false;
  }
  return readBoolEnv(import.meta.env.VITE_TABLET_SOCKET_ENABLED, true);
}

export function isUiOnlyMode() {
  if (readUrlFlag("uiOnly")) {
    return true;
  }
  return readBoolEnv(import.meta.env.VITE_TABLET_UI_ONLY, false);
}
