export const DESIGN_WIDTH = 1212;
export const DESIGN_HEIGHT = 834;

// Figma 1212x834 canvas. The footer CTA is rendered outside the scaled stage.
export const LAYOUT = {
  headerTop: 20,
  tabTop: 66,
  contentTop: 126,
  contentHeight: 540,
  footerTop: 697,
  footerHeight: 137,
  finishButtonTop: 26,
};

export const TAB_CONFIG = {
  blush: {
    target: "blush",
    productType: "objet_blush",
    dbProductType: "blush",
    labelEn: "Objet blush",
    labelKo: "오브제 블러쉬",
    allColorsSubtitle: ["오브제 블러쉬의", "모든 컬러들이 모여있어요."],
  },
  lip: {
    target: "lip",
    productType: "objet_liquid",
    dbProductType: "lip",
    labelEn: "Objet liquid",
    labelKo: "오브제 리퀴드",
    allColorsSubtitle: ["오브제 리퀴드의", "모든 컬러들이 모여있어요."],
  },
};

export const COLOR_CHIP_SIZE = 128;
export const COLOR_CHIP_SELECTED_SIZE = 140;
export const COLOR_CHIP_GAP = 30;

export const tabletLogoSrc = "/data/images/tabletlogo_red.png";
export const blushLogoSrc = "/data/images/blush_logo.png";
export const blushIconSrc = "/data/images/blush_icon.png";

// Test mode: preserve the design ratio, fill the viewport, and keep the footer outside.
export const SCALE_MODE = "cover";
