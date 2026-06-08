import { useEffect, useMemo, useState } from "react";
import noirColorDb from "@data/noir_color_db.json";
import {
  excludeRecommended,
  sortProductsByDisplayId,
  sortRecommendations,
} from "../utils/productUtils.js";
import { TAB_CONFIG } from "../constants.js";
import {
  getLoadSourceLabel,
  loadRecommendationResult,
  LOAD_SOURCES,
} from "../utils/loadRecommendation.js";
import fallbackRecommendation from "../data/recommendation_result.json";
import { isUiOnlyMode } from "../utils/devConfig.js";

function pickProductsByType(productType) {
  return noirColorDb.products.filter((product) => product.productType === productType);
}

export function useTabletData() {
  const uiOnly = isUiOnlyMode();

  const [recommendationResult, setRecommendationResult] = useState(fallbackRecommendation);
  const [isRefreshing, setIsRefreshing] = useState(!uiOnly);
  const [error, setError] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [loadSource, setLoadSource] = useState(uiOnly ? LOAD_SOURCES.FALLBACK : null);

  useEffect(() => {
    let isMounted = true;

    async function loadRecommendation() {
      if (uiOnly) {
        return;
      }

      setIsRefreshing(true);
      try {
        const result = await loadRecommendationResult();
        if (!isMounted) {
          return;
        }

        setRecommendationResult(result.recommendationResult);
        setSessionId(result.sessionId);
        setLoadSource(result.loadSource);

        if (result.error) {
          setError(result.error);
          console.warn("[tablet] using fallback recommendation data", result.error);
        } else {
          setError(null);
          console.info(
            "[tablet] recommendation loaded",
            result.loadSource,
            result.sessionId,
          );
        }
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        setRecommendationResult(fallbackRecommendation);
        setLoadSource(LOAD_SOURCES.FALLBACK);
        setError(loadError.message);
        console.warn("[tablet] using fallback recommendation data", loadError);
      } finally {
        if (isMounted) {
          setIsRefreshing(false);
        }
      }
    }

    loadRecommendation();

    return () => {
      isMounted = false;
    };
  }, [uiOnly]);

  const catalogByTab = useMemo(() => {
    const recommendations = recommendationResult?.recommendations || {};

    return {
      blush: {
        recommended: sortRecommendations(recommendations.blush || []).slice(0, 3),
        all: sortProductsByDisplayId(pickProductsByType(TAB_CONFIG.blush.dbProductType)),
      },
      lip: {
        recommended: sortRecommendations(recommendations.lip || []).slice(0, 3),
        all: sortProductsByDisplayId(pickProductsByType(TAB_CONFIG.lip.dbProductType)),
      },
    };
  }, [recommendationResult]);

  const remainingByTab = useMemo(
    () => ({
      blush: excludeRecommended(catalogByTab.blush.all, catalogByTab.blush.recommended),
      lip: excludeRecommended(catalogByTab.lip.all, catalogByTab.lip.recommended),
    }),
    [catalogByTab],
  );

  const loadSourceLabel = useMemo(
    () => getLoadSourceLabel(loadSource, sessionId),
    [loadSource, sessionId],
  );

  return {
    isRefreshing,
    error,
    sessionId,
    loadSource,
    loadSourceLabel,
    recommendationResult,
    catalogByTab,
    remainingByTab,
  };
}
