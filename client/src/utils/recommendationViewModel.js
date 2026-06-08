const OBJET_BASE = "/data/images/objet";

const EYE_SHADE_ORDER = [
  "glitter",
  "base_matt",
  "semi_glitter_matt",
  "blending_matt",
];

const EYE_SHADE_LABELS = {
  glitter: "glitter",
  base_matt: "base matt",
  semi_glitter_matt: "semi glitter matt",
  blending_matt: "blending matt",
};

function lipColorchipSrc(id, name) {
  return `${OBJET_BASE}/lip_colorchip/${id}_${name}.png`;
}

function blushColorchipSrc(id) {
  return `${OBJET_BASE}/blush_colorchip/${id}.png`;
}

function eyePaletteObjetSrc(id, name) {
  return `${OBJET_BASE}/eye_palette_objet/${id}_${name}.png`;
}

function eyePaletteChipSrc(id, name) {
  return `${OBJET_BASE}/eye_palette_objet/${id}_${name}_chip.png`;
}

function eyePaletteShadeSrc(id, shadeKey) {
  return `${OBJET_BASE}/eye_palette_colorchip/${id}_${shadeKey}.png`;
}

function formatDisplayName(name) {
  return String(name || "").replace(/_/g, " ").toUpperCase();
}

function formatDisplayId(id, digits) {
  return String(id).padStart(digits, "0");
}

function sortByCategoryRank(products) {
  return [...products].sort((a, b) => {
    const rankA = a.categoryRank ?? Number.MAX_SAFE_INTEGER;
    const rankB = b.categoryRank ?? Number.MAX_SAFE_INTEGER;
    return rankA - rankB;
  });
}

function mapLipOrBlushItem(product) {
  const { id, name, hex, productType, categoryRank } = product;
  const displayID = product.displayID ?? formatDisplayId(id, 3);
  const displayName = product.displayName ?? formatDisplayName(name);
  const imageSrc =
    productType === "lip"
      ? lipColorchipSrc(id, name)
      : blushColorchipSrc(id);

  return {
    categoryRank,
    displayID,
    displayName,
    color: hex || "#101010",
    imageSrc,
  };
}

function mapEyePalette(product) {
  const { id, name, shades = {} } = product;
  const displayID = product.displayID ?? formatDisplayId(id, 2);
  const displayName = product.displayName ?? formatDisplayName(name);

  return {
    displayID,
    displayName,
    imageSrc: eyePaletteObjetSrc(id, name),
    shades: EYE_SHADE_ORDER.map((shadeKey) => {
      const shade = shades[shadeKey] || {};
      return {
        key: shadeKey,
        label: EYE_SHADE_LABELS[shadeKey],
        hex: shade.hex || "#DDDDDD",
        imageSrc: eyePaletteShadeSrc(id, shadeKey),
      };
    }),
  };
}

/**
 * recommendation_result.json → RecommendationsScreen UI 모델
 */
export function buildRecommendationViewModel(recommendationResult) {
  const recommendations = recommendationResult?.recommendations;
  if (!recommendations) {
    return null;
  }

  const lipItems = sortByCategoryRank(recommendations.lip || []).map(mapLipOrBlushItem);
  const blushItems = sortByCategoryRank(recommendations.blush || []).map(mapLipOrBlushItem);
  const eyePalette = recommendations.eye_palette?.[0];

  return {
    lip: lipItems,
    blush: blushItems,
    eyePalette: eyePalette ? mapEyePalette(eyePalette) : null,
    lipRow: {
      category: "LIPS",
      productEn: "OBJET LIQUID",
      productKo: "오브제 리퀴드",
      items: lipItems,
    },
    blushRow: {
      category: "BLUSH",
      productEn: "OBJET BLUSH",
      productKo: "오브제 블러쉬",
      items: blushItems,
    },
    eyesPanel: eyePalette
      ? {
          category: "EYES",
          productEn: "TWIST POT",
          productKo: "트위스트 팟 아이 팔레트",
          ...mapEyePalette(eyePalette),
        }
      : null,
  };
}

/**
 * 테스팅 완료 화면 — 립 1·2·3등 → 블러셔 1·2·3등 → 아이 팔레트 (총 7개)
 */
export function buildTestingCompleteChips(recommendationResult) {
  const viewModel = buildRecommendationViewModel(recommendationResult);
  if (!viewModel) {
    return [];
  }

  const chips = [
    ...viewModel.lip.map((item) => ({ kind: "lip_blush", ...item })),
    ...viewModel.blush.map((item) => ({ kind: "lip_blush", ...item })),
  ];

  const eye = recommendationResult?.recommendations?.eye_palette?.[0];
  if (eye) {
    chips.push({
      kind: "eye_palette",
      displayID: eye.displayID ?? formatDisplayId(eye.id, 2),
      displayName: eye.displayName ?? formatDisplayName(eye.name),
      imageSrc: eyePaletteChipSrc(eye.id, eye.name),
    });
  }

  return chips;
}
