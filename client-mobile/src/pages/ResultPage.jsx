import { useEffect, useMemo, useState } from "react";
import HeroSection from "../components/HeroSection.jsx";
import NoirPaletteSection from "../components/NoirPaletteSection.jsx";
import ToneBlueprintSection from "../components/ToneBlueprintSection.jsx";
import { fluid, lh } from "../utils/fluid.js";
import { resolveMetricsFromRecommendation } from "../utils/metrics.js";
import { buildMobileViewModel } from "../utils/mobileViewModel.js";
import fallbackRecommendation from "../data/recommendation_result.json";

function getSessionIdFromPath() {
  if (typeof window === "undefined") {
    return "";
  }

  const match = window.location.pathname.match(/\/result\/([^/]+)/);
  return match?.[1] || "";
}

async function fetchJson(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Request failed: ${path}`);
  }
  return response.json();
}

export default function ResultPage() {
  const [recommendationResult, setRecommendationResult] = useState(fallbackRecommendation);

  useEffect(() => {
    let isMounted = true;

    async function loadRecommendation() {
      const sessionId = getSessionIdFromPath();

      try {
        const data = sessionId
          ? await fetchJson(`/api/mobile/final-selection/${encodeURIComponent(sessionId)}`)
          : await fetchJson("/api/mobile/final-selection/latest");
        if (isMounted) {
          setRecommendationResult(data);
        }
        return;
      } catch {
        // Fallback below keeps local development renderable without final_selection.json.
      }

      if (!sessionId) {
        return;
      }

      try {
        const data = await fetchJson(
          `/outputs/sessions/${encodeURIComponent(sessionId)}/recommendation_result.json`,
        );
        if (isMounted) {
          setRecommendationResult(data);
        }
      } catch {
        // Dev fallback JSON keeps the page renderable without the API server.
      }
    }

    loadRecommendation();

    return () => {
      isMounted = false;
    };
  }, []);

  const viewModel = useMemo(
    () => buildMobileViewModel(recommendationResult),
    [recommendationResult],
  );
  const metrics = useMemo(
    () => resolveMetricsFromRecommendation(recommendationResult),
    [recommendationResult],
  );

  return (
    <main className="mx-auto min-h-screen w-full bg-white">
      <HeroSection />
      <ToneBlueprintSection viewModel={viewModel} metrics={metrics} />
      <NoirPaletteSection viewModel={viewModel} />
      <footer
        className="mx-auto text-center font-pretendard text-[#3F3F3F]"
        style={{
          maxWidth: fluid(402),
          padding: `${fluid(40)} ${fluid(24)} ${fluid(60)}`,
          fontSize: fluid(12),
          lineHeight: lh.footer,
          letterSpacing: "-0.02em",
        }}
      >
        본 페이지의 데이터는 보안을 위해
        <br />
        5분 이내에 자동 삭제됩니다.
      </footer>
    </main>
  );
}
