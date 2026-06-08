import { TAB_CONFIG } from "../constants.js";
import HorizontalColorList from "./HorizontalColorList.jsx";

export default function AllColorsSection({
  products,
  target,
  selectedProduct,
  onSelect,
  scrollLeft,
  onScrollLeftChange,
}) {
  const subtitleLines = TAB_CONFIG[target].allColorsSubtitle;

  return (
    <section className="flex flex-col gap-[20px] bg-[#fafafa] px-[40px] pb-[20px] pt-[30px]">
      <div className="flex h-[60px] flex-col justify-center gap-[10px]">
        <h2 className="font-pretendard text-[20px] font-bold uppercase leading-[18px] text-[#101010]">
          Muzigae mension
        </h2>
        <p className="font-pretendard text-[15px] font-medium leading-[1.2] text-[#8e8e93]">
          {subtitleLines[0]}
          <br />
          {subtitleLines[1]}
        </p>
      </div>

      <HorizontalColorList
        products={products}
        target={target}
        selectedProduct={selectedProduct}
        onSelect={onSelect}
        scrollLeft={scrollLeft}
        onScrollLeftChange={onScrollLeftChange}
      />
    </section>
  );
}
