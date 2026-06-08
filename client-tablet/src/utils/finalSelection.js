import { resolveApiUrl } from "./serverConfig.js";

function getMobileOrigin() {
  if (typeof window === "undefined") {
    return "";
  }

  return `${window.location.protocol}//${window.location.hostname}:5174`;
}

export async function submitFinalSelection({ sessionId, selected }) {
  const response = await fetch(resolveApiUrl("/api/tablet/final-selection"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sessionId,
      selected,
      mobileOrigin: getMobileOrigin(),
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data?.ok) {
    throw new Error(data?.detail || "Failed to save final selection.");
  }

  return data;
}
