import posterImg from "@data/images/poster.png?url";
import logoMbImg from "@data/images/logo_mb.png?url";
import arrowImg from "@data/images/arrow.png?url";
import arrowEndImg from "@data/images/arrow_end.png?url";
import linkLogoImg from "@data/images/link_logo.png?url";

const lipObjetModules = import.meta.glob(
  "@data/images/objet/lip_objet/*.{png,webp,jpg}",
  { eager: true, import: "default" },
);
const blushObjetModules = import.meta.glob(
  "@data/images/objet/blush_objet/*.{png,webp,jpg}",
  { eager: true, import: "default" },
);
const eyePaletteObjetModules = import.meta.glob(
  "@data/images/objet/eye_palette_objet/*.{png,webp,jpg}",
  { eager: true, import: "default" },
);
const eyePaletteShadeModules = import.meta.glob(
  "@data/images/objet/eye_palette_colorchip/*.{png,webp,jpg}",
  { eager: true, import: "default" },
);

export const posterSrc = posterImg;
export const logoMbSrc = logoMbImg;
export const arrowSrc = arrowImg;
export const arrowEndSrc = arrowEndImg;
export const linkLogoSrc = linkLogoImg;

function findAsset(modules, pattern) {
  const entry = Object.entries(modules).find(([path]) => path.includes(pattern));
  return entry?.[1] || "";
}

export function lipObjetSrc(id, name) {
  return findAsset(lipObjetModules, `${id}_${name}`);
}

export function blushObjetSrc(id, name) {
  return findAsset(blushObjetModules, `${id}_${name}_1`) || findAsset(blushObjetModules, `${id}_${name}`);
}

export function eyePaletteObjetSrc(id, name) {
  const entry = Object.entries(eyePaletteObjetModules).find(
    ([path]) => path.includes(`${id}_${name}.`) && !path.includes("_chip"),
  );
  return entry?.[1] || "";
}

export function eyePaletteShadeSrc(id, shadeKey) {
  return findAsset(eyePaletteShadeModules, `${id}_${shadeKey}`);
}
