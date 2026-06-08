import { fluid } from "../utils/fluid.js";
import ProductCard from "./ProductCard.jsx";
import SectionHeading from "./SectionHeading.jsx";

export default function NoirPaletteSection({ viewModel }) {
  return (
    <section
      className="mx-auto w-full"
      style={{
        maxWidth: fluid(402),
        padding: `0 ${fluid(13)}`,
        paddingBottom: fluid(80),
        display: "flex",
        flexDirection: "column",
        gap: fluid(80),
      }}
    >
      <SectionHeading
        titleLines={["Your", "Noir Palette"]}
        description={
          <>
            직접 인터랙션한 컬러의 제품들을
            <br />
            무지개맨션에서 만나보세요!
          </>
        }
      />

      <div style={{ display: "flex", flexDirection: "column", gap: fluid(60) }}>
        <ProductCard product={viewModel?.lip} variant="lip" />
        <ProductCard product={viewModel?.blush} variant="blush" />
        <ProductCard product={viewModel?.eyePalette} variant="eye_palette" />
      </div>
    </section>
  );
}
