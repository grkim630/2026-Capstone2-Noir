import { LAYOUT, TAB_CONFIG } from "../constants.js";

export default function TabBar({ activeTab, onTabChange }) {
  return (
    <nav
      className="absolute left-0 flex h-[60px] w-full items-center justify-center gap-[20px] border-b-2 border-[#ddd] bg-white px-[30px]"
      style={{ top: LAYOUT.tabTop }}
      aria-label="제품 탭"
    >
      {Object.entries(TAB_CONFIG).map(([tabKey, config]) => {
        const isActive = activeTab === tabKey;

        return (
          <button
            key={tabKey}
            type="button"
            onClick={() => onTabChange(tabKey)}
            className={[
              "tablet-tab-button flex h-full w-[150px] flex-col items-center justify-center gap-[2px] uppercase",
              isActive ? "is-active text-[#101010]" : "text-[#bfbfbf]",
            ].join(" ")}
            aria-pressed={isActive}
          >
            <span className="font-pretendard text-[12px] font-bold leading-[16px]">
              {config.labelEn}
            </span>
            <span className="font-pretendard text-[12px] font-normal leading-[16px]">
              {config.labelKo}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
