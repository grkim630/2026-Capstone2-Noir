import { TAB_CONFIG } from "../constants.js";

export function normalizeImageName(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9_]/g, "");
}

export function getColorchipImagePath(product, target) {
  if (product?.imageFileName) {
    const folder = target === "blush" ? "blush_colorchip" : "lip_colorchip";
    return `/data/images/objet/${folder}/${product.imageFileName}`;
  }

  if (target === "blush") {
    return `/data/images/objet/blush_colorchip/${product.id}.png`;
  }

  if (target === "lip") {
    const numericId = Number.parseInt(product.id, 10);
    const imageId = Number.isNaN(numericId) ? product.id : numericId;
    const normalizedName = normalizeImageName(product.name);
    return `/data/images/objet/lip_colorchip/${imageId}_${normalizedName}.png`;
  }

  return "";
}

export function buildNormalizedRgb(rgb) {
  const [r = 0, g = 0, b = 0] = rgb || [];
  return {
    r: Math.round((r / 255) * 1000) / 1000,
    g: Math.round((g / 255) * 1000) / 1000,
    b: Math.round((b / 255) * 1000) / 1000,
  };
}

export function buildSelectedProduct(product, target) {
  const tabConfig = TAB_CONFIG[target];
  const rgb = product.rgb || [];

  return {
    event: "color_selected",
    target,
    productType: tabConfig.productType,
    id: product.id,
    name: product.name,
    displayName: product.displayName,
    displayID: product.displayID,
    hex: product.hex,
    rgb,
    normalizedRgb: buildNormalizedRgb(rgb),
  };
}

export function buildColorSelectSocketPayload(selectedProduct) {
  if (!selectedProduct) {
    return null;
  }

  return {
    event: "color_selected",
    target: selectedProduct.target,
    productType: selectedProduct.productType,
    id: selectedProduct.id,
    displayName: selectedProduct.displayName,
    displayID: selectedProduct.displayID,
    hex: selectedProduct.hex,
    rgb: selectedProduct.rgb,
    normalizedRgb: selectedProduct.normalizedRgb,
  };
}

export function isSameSelectedProduct(selected, product, target) {
  if (!selected || !product) {
    return false;
  }

  return selected.id === product.id && selected.target === target;
}

export function productKey(product, target) {
  return `${target}_${product.id}`;
}

export function sortProductsByDisplayId(products) {
  return [...products].sort((a, b) => {
    const idA = Number.parseInt(a.displayID, 10);
    const idB = Number.parseInt(b.displayID, 10);
    if (Number.isNaN(idA) || Number.isNaN(idB)) {
      return String(a.displayID).localeCompare(String(b.displayID));
    }
    return idA - idB;
  });
}

export function sortRecommendations(products) {
  return [...products].sort((a, b) => {
    const rankA = a.categoryRank ?? Number.MAX_SAFE_INTEGER;
    const rankB = b.categoryRank ?? Number.MAX_SAFE_INTEGER;
    return rankA - rankB;
  });
}

export function excludeRecommended(allProducts, recommendedProducts) {
  const recommendedIds = new Set(recommendedProducts.map((product) => product.id));
  return allProducts.filter((product) => !recommendedIds.has(product.id));
}

export function buildTestingFinishPayload(selectedByTab) {
  const selected = {};

  for (const target of ["blush", "lip"]) {
    const item = selectedByTab[target];
    if (!item) {
      continue;
    }

    selected[target] = {
      target: item.target,
      id: item.id,
      name: item.name,
      displayName: item.displayName,
      displayID: item.displayID,
      hex: item.hex,
      rgb: item.rgb,
      productType: item.productType,
    };
  }

  return {
    event: "testing_finished",
    selected,
  };
}
