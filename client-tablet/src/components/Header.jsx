import { LAYOUT, tabletLogoSrc } from "../constants.js";

export default function Header() {
  const handleLogoRefresh = () => {
    window.location.reload();
  };

  return (
    <header
      className="absolute left-0 flex w-full items-start justify-between px-[21px]"
      style={{ top: LAYOUT.headerTop, height: 30 }}
    >
      <button
        type="button"
        onClick={handleLogoRefresh}
        aria-label="태블릿 화면 새로고침"
        className="h-[25px] w-[87px] touch-manipulation"
        style={{
          display: "block",
          appearance: "none",
          WebkitAppearance: "none",
          outline: "none",
        }}
      >
        <img
          src={tabletLogoSrc}
          alt="NOIR"
          className="h-[25px] w-[87px] object-contain object-left"
          draggable={false}
        />
      </button>

      <h1 className="absolute left-1/2 top-[3px] -translate-x-1/2 font-pretendard text-[24px] font-bold uppercase leading-none text-[#1a1a1a]">
        Discover your color
      </h1>

      <p className="max-w-[220px] text-right font-pretendard text-[14px] leading-[1.2] text-[#3f3f3f]">
        원하는 제품의 색상을 고르고
        <br />
        테스트할 부위로 적용해보세요!
      </p>
    </header>
  );
}
