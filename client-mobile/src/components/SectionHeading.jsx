import { fluid, lh } from "../utils/fluid.js";

export default function SectionHeading({ titleLines, description }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: fluid(30) }}>
      <div
        className="font-bethany-elingston text-[#AB0D00]"
        style={{
          fontSize: fluid(48),
          lineHeight: lh.heading,
          letterSpacing: "-0.02em",
        }}
      >
        {titleLines.map((line) => (
          <p key={line} className="m-0">
            {line}
          </p>
        ))}
      </div>
      {description && (
        <p
          className="m-0 font-pretendard text-[#6F6F6F]"
          style={{ fontSize: fluid(16), lineHeight: lh.body }}
        >
          {description}
        </p>
      )}
    </div>
  );
}
