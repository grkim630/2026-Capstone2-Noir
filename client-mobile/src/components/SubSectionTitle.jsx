import { fluid, lh } from "../utils/fluid.js";

export default function SubSectionTitle({ index, titleLines, subtitle }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: fluid(15) }}>
      <p
        className="m-0 font-pretendard uppercase text-[#DDDDDD]"
        style={{ fontSize: fluid(20), lineHeight: lh.body }}
      >
        {index}
      </p>
      <div
        className="font-pretendard uppercase text-[#101010]"
        style={{ fontSize: fluid(24), lineHeight: lh.title }}
      >
        {titleLines.map((line, i) => (
          <p key={line} className={`m-0 ${i === 0 ? "font-bold" : "font-semibold"}`}>
            {line}
          </p>
        ))}
      </div>
      {subtitle && (
        <p
          className="m-0 font-pretendard text-[#6F6F6F]"
          style={{ fontSize: fluid(16), lineHeight: lh.body }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}
