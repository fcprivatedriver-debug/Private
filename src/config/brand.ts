/** ZRIK — premium European private mobility. */

export const BRAND_NAME = "ZRIK";
export const BRAND_INK = "#111111";
export const BRAND_ACCENT = "#1F5A96"; // Azure Prestige
export const BRAND_ACCENT_STRONG = "#184A7C";

export const BRAND_TAGLINE_PT = {
  line1: "Tu escolhes.",
  line2: "O resto é connosco.",
  full: "Tu escolhes. O resto é connosco.",
} as const;

export const BRAND_TAGLINE_EN = {
  line1: "You choose.",
  line2: "We handle the rest.",
  full: "You choose. We handle the rest.",
} as const;

export const BRAND_META = {
  titleDefault: "ZRIK — Mobilidade privada",
  titleTemplate: "%s · ZRIK",
  description:
    "Marketplace de chauffeurs privados. Publica o pedido, recebe propostas e escolhe com controlo total.",
} as const;

/** @deprecated Prefer BRAND_NAME — kept for gradual migration from APP_NAME. */
export const APP_NAME = BRAND_NAME;
