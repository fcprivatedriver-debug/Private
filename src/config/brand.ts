/**
 * Tripvo brand — production locks only (no lab / A-B / FB variants).
 */

export const BRAND_INK = "#111111";
/** Petrol green — primary brand accent from Tripvo reference. */
export const PRODUCTION_ACCENT = "#1F4F46";
export const PRODUCTION_ACCENT_STRONG = "#163B35";

/** Full-bleed premium transfer atmosphere (edge-to-edge hero). */
export const PRODUCTION_HERO =
  "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=2400&q=80";

/** Light veil — photo remains the atmosphere */
export const PRODUCTION_OVERLAY = 0.42;

export const PRODUCTION_SLOGAN = {
  line1Pt: "Peça a sua viagem.",
  line2Pt: "Escolha o melhor motorista.",
  line1En: "Request your trip.",
  line2En: "Choose the best driver.",
  tagline: "Travel your way",
} as const;
