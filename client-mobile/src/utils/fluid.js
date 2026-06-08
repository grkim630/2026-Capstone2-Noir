const BASE_WIDTH = 402;

/** 402px 기준 디자인 값을 뷰포트에 맞게 스케일 */
export function fluid(px) {
  return `calc(${px} * var(--fluid))`;
}

export function fluidStyle(values) {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, fluid(value)]),
  );
}

/** 전역 행간 — 기존 대비 소폭 축소 */
export const lh = {
  heading: 1.05,
  title: 1.05,
  body: 1.25,
  tight: 1.1,
  chip: 1.15,
  chipTight: 1.1,
  footer: 1.15,
};

export { BASE_WIDTH };
