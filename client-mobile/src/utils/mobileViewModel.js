import {
  blushObjetSrc,
  eyePaletteObjetSrc,
  lipObjetSrc,
} from "./assets.js";

const BUY_URLS = {
  lip: "https://muzigae-mansion.com/product/%EC%98%A4%EB%B8%8C%EC%A0%9C-%EB%A6%AC%ED%80%B4%EB%93%9C-%ED%8B%B4%ED%8A%B8-36%EC%A2%85-%ED%83%9D-1/37/category/63/display/1/",
  blush:
    "https://muzigae-mansion.com/product/%EC%98%A4%EB%B8%8C%EC%A0%9C-%EB%B8%94%EB%9F%AC%EC%89%AC-10%EC%A2%85-%ED%83%9D1/115/category/66/display/1/",
  eye_palette:
    "https://muzigae-mansion.com/product/%ED%8A%B8%EC%9C%84%EC%8A%A4%ED%8A%B8-%ED%8C%9F-%EC%95%84%EC%9D%B4%ED%8C%94%EB%A0%88%ED%8A%B8-5%EC%A2%85-%ED%83%9D1/96/category/65/display/1/",
};

function capitalizeName(name) {
  const text = String(name || "");
  if (!text) {
    return "";
  }
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

function sortByCategoryRank(products) {
  return [...products].sort((a, b) => {
    const rankA = a.categoryRank ?? Number.MAX_SAFE_INTEGER;
    const rankB = b.categoryRank ?? Number.MAX_SAFE_INTEGER;
    return rankA - rankB;
  });
}

function mapFaceColorChips(recommendationResult) {
  const colors = recommendationResult?.userAnalysis?.facialColors || {};
  const skinHex = recommendationResult?.userAnalysis?.skinHEX || colors.skin?.hex || "#DDDDDD";

  return {
    facialRow1: [
      { label: "입술", hex: colors.lip?.hex || "#DDDDDD" },
      { label: "볼", hex: colors.cheek?.hex || "#DDDDDD" },
      { label: "미간", hex: colors.forehead?.hex || "#DDDDDD" },
    ],
    facialRow2: [
      { label: "눈두덩이", hex: colors.eyeArea?.hex || "#DDDDDD" },
      { label: "눈동자", hex: colors.iris?.hex || "#DDDDDD" },
      { label: "베이스\n파운데이션", hex: skinHex, multiline: true },
    ],
  };
}

function mapTopProduct(product, type) {
  if (!product) {
    return null;
  }

  const { id, name, hex, displayID, displayName } = product;

  if (type === "lip") {
    return {
      categoryLabel: "objet liquid",
      displayID,
      productName: capitalizeName(name),
      hex,
      imageSrc: lipObjetSrc(id, name),
      buyLabel: "립 구매하기",
      buyUrl: BUY_URLS.lip,
    };
  }

  if (type === "blush") {
    return {
      categoryLabel: "objet Blush",
      displayID,
      productName: capitalizeName(name),
      hex,
      imageSrc: blushObjetSrc(id, name),
      buyLabel: "블러쉬 구매하기",
      buyUrl: BUY_URLS.blush,
    };
  }

  return {
    categoryLabel: "Twist pot",
    displayID,
    productName: displayName || capitalizeName(name),
    hex,
    imageSrc: eyePaletteObjetSrc(id, name),
    buyLabel: "아이팔레트 구매하기",
    buyUrl: BUY_URLS.eye_palette,
  };
}

export function buildMobileViewModel(recommendationResult) {
  if (!recommendationResult?.userAnalysis) {
    return null;
  }

  const recommendations = recommendationResult.recommendations || {};
  const finalSelection = recommendationResult.finalSelection;
  const topLip = finalSelection?.lip || sortByCategoryRank(recommendations.lip || [])[0];
  const topBlush = finalSelection?.blush || sortByCategoryRank(recommendations.blush || [])[0];
  const topEyePalette = finalSelection?.eyePalette || recommendations.eye_palette?.[0];

  return {
    faceColors: mapFaceColorChips(recommendationResult),
    lip: mapTopProduct(topLip, "lip"),
    blush: mapTopProduct(topBlush, "blush"),
    eyePalette: mapTopProduct(topEyePalette, "eye_palette"),
  };
}
