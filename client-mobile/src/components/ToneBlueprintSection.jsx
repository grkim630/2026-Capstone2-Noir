import { fluid } from "../utils/fluid.js";
import ComprehensiveProfile from "./ComprehensiveProfile.jsx";
import FaceColorMap from "./FaceColorMap.jsx";
import ScrollArrow from "./ScrollArrow.jsx";
import SectionHeading from "./SectionHeading.jsx";
import SubSectionTitle from "./SubSectionTitle.jsx";

export default function ToneBlueprintSection({ viewModel, metrics }) {
  return (
    <section
      className="mx-auto w-full"
      style={{
        maxWidth: fluid(402),
        padding: `0 ${fluid(17)}`,
        paddingTop: fluid(80),
        paddingBottom: fluid(80),
        display: "flex",
        flexDirection: "column",
        gap: fluid(80),
      }}
    >
      <SectionHeading
        titleLines={["Your", "Tone Blueprint"]}
        description={
          <>
            누아르의 알고리즘을 통해
            <br />
            얼굴의 베이스 톤을 분석한 결과입니다.
          </>
        }
      />

      <div style={{ display: "flex", flexDirection: "column", gap: fluid(50) }}>
        <SubSectionTitle
          index="001"
          titleLines={["Facial Color ", "Extraction"]}
          subtitle="페이스 컬러 맵"
        />
        <FaceColorMap
          faceColors={viewModel?.faceColors}
          melanin={metrics?.melanin}
          redness={metrics?.redness}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: fluid(60) }}>
        <SubSectionTitle
          index="002"
          titleLines={["Comprehensive", "Profile"]}
          subtitle="종합 프로필"
        />
        <ComprehensiveProfile metrics={metrics} />
      </div>

      <div className="flex justify-center">
        <ScrollArrow variant="arrow_end" height={54} />
      </div>
    </section>
  );
}
