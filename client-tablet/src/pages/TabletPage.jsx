import { useCallback, useEffect, useRef, useState } from "react";
import { createTabletSocket } from "../hooks/useTabletHooks.js";
import { useTabletData } from "../hooks/useTabletData.js";
import FullscreenScaleWrapper from "../components/FullscreenScaleWrapper.jsx";
import Header from "../components/Header.jsx";
import TabBar from "../components/TabBar.jsx";
import RecommendSection from "../components/RecommendSection.jsx";
import AllColorsSection from "../components/AllColorsSection.jsx";
import FinishButton from "../components/FinishButton.jsx";
import TestingFinishModal from "../components/TestingFinishModal.jsx";
import EndingPage from "../components/EndingPage.jsx";
import { LAYOUT } from "../constants.js";
import {
  buildColorSelectSocketPayload,
  buildSelectedProduct,
  buildTestingFinishPayload,
  getColorchipImagePath,
} from "../utils/productUtils.js";
import { isSocketEnabled, isUiOnlyMode } from "../utils/devConfig.js";
import { submitFinalSelection } from "../utils/finalSelection.js";
import { preloadImages } from "../utils/preloadImages.js";

export default function TabletPage() {
  const { isRefreshing, loadSourceLabel, sessionId, catalogByTab, remainingByTab } =
    useTabletData();
  const [activeTab, setActiveTab] = useState("blush");
  const [selectedByTab, setSelectedByTab] = useState({ blush: null, lip: null });
  const [finishModalOpen, setFinishModalOpen] = useState(false);
  const [finishError, setFinishError] = useState("");
  const [isFinishing, setIsFinishing] = useState(false);
  const [endingUrl, setEndingUrl] = useState("");
  const scrollPositionByTab = useRef({ blush: 0, lip: 0 });
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = createTabletSocket();
    if (!socket) {
      if (import.meta.env.DEV) {
        console.info("[tablet] WebSocket disabled (UI-only / dev mode)");
      }
      return undefined;
    }

    socketRef.current = socket;

    socket.on("connect", () => {
      console.info("[tablet] socket connected", socket.id);
    });
    socket.on("disconnect", () => {
      console.warn("[tablet] socket disconnected");
    });
    socket.on("connect_error", (connectError) => {
      console.error("[tablet] socket connect error", connectError.message);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!import.meta.env.DEV) {
      return;
    }

    console.info("[tablet] recommendation", {
      sessionId,
      loadSourceLabel,
      isRefreshing,
      uiOnly: isUiOnlyMode(),
      socketEnabled: isSocketEnabled(),
    });
  }, [sessionId, loadSourceLabel, isRefreshing]);

  useEffect(() => {
    const srcs = [];

    for (const target of ["blush", "lip"]) {
      const products = [
        ...(catalogByTab[target]?.recommended || []),
        ...(catalogByTab[target]?.all || []),
      ];

      for (const product of products) {
        srcs.push(getColorchipImagePath(product, target));
      }
    }

    preloadImages(srcs);
  }, [catalogByTab]);

  const emitColorSelect = useCallback((selectedProduct) => {
    const payload = buildColorSelectSocketPayload(selectedProduct);
    if (!payload) {
      return;
    }

    if (!socketRef.current) {
      console.info("[tablet] color-select (local only)", payload);
      return;
    }

    socketRef.current.emit("tablet:color-select", payload);
    console.info("[tablet] color-select", payload);
  }, []);

  const handleColorSelect = useCallback(
    (product) => {
      const selectedProduct = buildSelectedProduct(product, activeTab);
      setSelectedByTab((prev) => ({
        ...prev,
        [activeTab]: selectedProduct,
      }));
      emitColorSelect(selectedProduct);
    },
    [activeTab, emitColorSelect],
  );

  const handleTabChange = useCallback(
    (nextTab) => {
      if (nextTab === activeTab) {
        return;
      }

      scrollPositionByTab.current[activeTab] =
        scrollPositionByTab.current[activeTab] ?? 0;
      setActiveTab(nextTab);

      const selected = selectedByTab[nextTab];
      if (selected) {
        emitColorSelect(selected);
      }
    },
    [activeTab, emitColorSelect, selectedByTab],
  );

  const handleScrollLeftChange = useCallback(
    (scrollLeft) => {
      scrollPositionByTab.current[activeTab] = scrollLeft;
    },
    [activeTab],
  );

  const handleFinishTesting = useCallback(() => {
    setFinishError("");
    setFinishModalOpen(true);
  }, []);

  const handleCancelFinish = useCallback(() => {
    if (isFinishing) {
      return;
    }
    setFinishError("");
    setFinishModalOpen(false);
  }, [isFinishing]);

  const handleConfirmFinish = useCallback(async () => {
    const payload = buildTestingFinishPayload(selectedByTab);
    if (!payload.selected.blush || !payload.selected.lip) {
      setFinishError("립과 블러쉬를 모두 선택해주세요.");
      return;
    }

    setIsFinishing(true);
    setFinishError("");

    if (socketRef.current) {
      socketRef.current.emit("tablet:testing-finish", payload);
    }
    console.info("[tablet] testing-finish", payload);

    try {
      const result = await submitFinalSelection({
        sessionId,
        selected: payload.selected,
      });
      setEndingUrl(result.mobileResultUrl);
      setFinishModalOpen(false);
    } catch (error) {
      console.error("[tablet] final-selection failed", error);
      setFinishError(error.message || "최종 선택 저장에 실패했어요.");
    } finally {
      setIsFinishing(false);
    }
  }, [selectedByTab, sessionId]);

  const handleEnd = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit("tablet:end", {
        event: "tablet_end",
        sessionId,
      });
    }
    setEndingUrl("");
    setSelectedByTab({ blush: null, lip: null });
    setActiveTab("blush");
  }, [sessionId]);

  const recommendedProducts = catalogByTab[activeTab]?.recommended || [];
  const remainingProducts = remainingByTab[activeTab] || [];
  const selectedProduct = selectedByTab[activeTab];

  if (endingUrl) {
    return (
      <FullscreenScaleWrapper
        stageHeight={LAYOUT.footerTop}
        reservedFooterHeight={LAYOUT.footerHeight}
        overlay={
          <FinishButton
            onClick={handleEnd}
            label="종료"
            showFooterBackground={false}
          />
        }
      >
        <EndingPage mobileResultUrl={endingUrl} />
      </FullscreenScaleWrapper>
    );
  }

  return (
    <FullscreenScaleWrapper
      overlay={
        <>
          <FinishButton onClick={handleFinishTesting} />
          <TestingFinishModal
            open={finishModalOpen}
            onConfirm={handleConfirmFinish}
            onCancel={handleCancelFinish}
            isSubmitting={isFinishing}
            errorMessage={finishError}
          />
        </>
      }
    >
      <div className="relative h-full w-full bg-white">
        <Header />
        <TabBar activeTab={activeTab} onTabChange={handleTabChange} />

        <main
          key={activeTab}
          className="tablet-tab-panel absolute left-0 w-full overflow-hidden bg-[#fafafa]"
          style={{
            top: LAYOUT.contentTop,
            height: LAYOUT.contentHeight,
            boxShadow: "inset 0px 4px 8px rgba(0,0,0,0.1)",
          }}
        >
          <RecommendSection
            products={recommendedProducts}
            target={activeTab}
            selectedProduct={selectedProduct}
            onSelect={handleColorSelect}
          />
          <AllColorsSection
            products={remainingProducts}
            target={activeTab}
            selectedProduct={selectedProduct}
            onSelect={handleColorSelect}
            scrollLeft={scrollPositionByTab.current[activeTab]}
            onScrollLeftChange={handleScrollLeftChange}
          />
        </main>
      </div>
    </FullscreenScaleWrapper>
  );
}
