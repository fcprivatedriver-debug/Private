/**
 * ZRIK brand candidates — nothing locked until chosen in /homepage-lab.
 */

export const BRAND_INK = "#111111";

/** Premium blues under active comparison (no production lock). */
export const ACCENT_CANDIDATES = [
  {
    id: "C1",
    hex: "#1F5A96",
    name: "Azure Prestige",
    namePt: "Azul prestígio",
    vibe: "Preferred · clear premium contrast",
    preferred: true,
  },
  {
    id: "C2",
    hex: "#245D8C",
    name: "Coastal Steel",
    namePt: "Aço costeiro",
    vibe: "Balanced · calm European",
    preferred: false,
  },
  {
    id: "C3",
    hex: "#2B6EA6",
    name: "Bright Atlantic",
    namePt: "Atlântico claro",
    vibe: "Open · tech-forward",
    preferred: false,
  },
] as const;

export type AccentCandidateId = (typeof ACCENT_CANDIDATES)[number]["id"];

/**
 * Three complete editorial Hero proposals.
 * Layout: text LEFT · photography RIGHT (campaign split — not text-over-image).
 * Experience is the protagonist; car is supporting.
 */
export const HERO_VERSIONS = [
  {
    id: "V1",
    src: "/brand/zrik-hero-v1.jpg",
    title: "Version 1 — White arrival",
    titlePt: "Versão 1 — Chegada em branco",
    desc: "White Model 3 · hotel porte-cochère · entering the cabin · bright European air",
    descPt: "Model 3 branco · porte-cochère · a entrar · luz europeia clara",
    mood: "Open · welcoming · luminous",
    moodPt: "Aberta · acolhedora · luminosa",
  },
  {
    id: "V2",
    src: "/brand/zrik-hero-v2.jpg",
    title: "Version 2 — Black contrast",
    titlePt: "Versão 2 — Contraste em preto",
    desc: "Black Model 3 · stronger paint contrast · same editorial crop · golden hour",
    descPt: "Model 3 preto · mais contraste · mesmo corte editorial · golden hour",
    mood: "Exclusive · cinematic · decisive",
    moodPt: "Exclusiva · cinematográfica · decisiva",
  },
  {
    id: "V3",
    src: "/brand/zrik-hero-v3.jpg",
    title: "Version 3 — The pause",
    titlePt: "Versão 3 — A pausa",
    desc: "Graphite sedan · traveler about to enter · experience before motion",
    descPt: "Berlina graphite · viajante a entrar · a experiência antes do movimento",
    mood: "Narrative · discreet luxury · human",
    moodPt: "Narrativa · luxo discreto · humana",
  },
] as const;

export type HeroVersionId = (typeof HERO_VERSIONS)[number]["id"];

/** Soft white veil on the photo panel only (photo stays clearly visible). */
export const OVERLAY_CANDIDATES = [
  { id: "O55", label: "55%", value: 0.55 },
  { id: "O60", label: "60%", value: 0.6 },
  { id: "O65", label: "65%", value: 0.65 },
] as const;

/** @deprecated use HERO_VERSIONS — kept for type compatibility during transition */
export const HERO_PHOTO_CANDIDATES = HERO_VERSIONS;
export type HeroPhotoId = HeroVersionId;

export const PRODUCTION_ACCENT = "#0D3B66";
export const PRODUCTION_HERO = "/brand/zrik-hero.jpg";

export const PETROL_BLUES = ACCENT_CANDIDATES.map((c) => ({
  id: c.id,
  hex: c.hex,
  name: c.name,
  namePt: c.namePt,
  vibe: c.vibe,
}));

export const DEFAULT_PETROL_BLUE = ACCENT_CANDIDATES[0]!;
