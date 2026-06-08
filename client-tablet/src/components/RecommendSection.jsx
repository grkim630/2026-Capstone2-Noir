import ColorChipButton from "./ColorChipButton.jsx";
import { isSameSelectedProduct } from "../utils/productUtils.js";

export default function RecommendSection({
  products,
  target,
  selectedProduct,
  onSelect,
}) {
  return (
    <section className="flex flex-col gap-[20px] bg-[#fafafa] px-[40px] pb-[20px] pt-[30px]">
      <div className="flex h-[60px] flex-col justify-center gap-[10px]">
        <h2 className="font-pretendard text-[20px] font-bold uppercase leading-[16px] text-[#ab0d00]">
          recommend from noir
        </h2>
        <p className="font-pretendard text-[15px] font-medium leading-[1.2] text-[#8e8e93]">
          노아르가 현재 베이스톤을 분석해서
          <br />
          추천하는 컬러들이에요.
        </p>
      </div>

      <div className="flex items-center">
        {products.map((product) => (
          <ColorChipButton
            key={`rec-${target}-${product.id}`}
            product={product}
            target={target}
            selected={isSameSelectedProduct(selectedProduct, product, target)}
            onSelect={onSelect}
          />
        ))}
      </div>
    </section>
  );
}
