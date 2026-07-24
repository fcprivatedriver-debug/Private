/**
 * ZRIK brand candidates — nothing here is locked as final until chosen in /homepage-lab.
 */

export const BRAND_INK = "#111111";

/** Color candidates for comparison (preferred first). */
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
  {
    id: "C4",
    hex: "#0D3B66",
    name: "Atlantic Navy",
    namePt: "Navy atlântico",
    vibe: "Current · denser / darker",
    preferred: false,
  },
] as const;

export type AccentCandidateId = (typeof ACCENT_CANDIDATES)[number]["id"];

/** Hero photography candidates — editorial chauffeur stories. */
export const HERO_PHOTO_CANDIDATES = [
  {
    id: "A",
    src: "/brand/zrik-hero-a.jpg",
    title: "Option A — White Model 3",
    titlePt: "Opção A — Model 3 branco",
    desc: "White Tesla · 3/4 crop · hotel porte-cochère · golden hour · left negative space",
    descPt: "Tesla branco · enquadramento 3/4 · hotel · golden hour · espaço negativo à esquerda",
  },
  {
    id: "B",
    src: "/brand/zrik-hero-b.jpg",
    title: "Option B — Black Model 3",
    titlePt: "Opção B — Model 3 preto",
    desc: "Black Tesla · same crop · hotel entrance · golden hour · stronger paint contrast",
    descPt: "Tesla preto · mesmo enquadramento · hotel · golden hour · mais contraste na pintura",
  },
] as const;

export type HeroPhotoId = (typeof HERO_PHOTO_CANDIDATES)[number]["id"];

/** Overlay opacity candidates for readability (not locked). */
export const OVERLAY_CANDIDATES = [
  { id: "O70", label: "70%", value: 0.7 },
  { id: "O72", label: "72%", value: 0.72 },
  { id: "O75", label: "75%", value: 0.75 },
] as const;

/**
 * Production homepage still uses the previous locked tokens until a winner
 * is chosen in the lab. Lab previews override via inline CSS variables.
 */
export const PRODUCTION_ACCENT = "#0D3B66";
export const PRODUCTION_HERO = "/brand/zrik-hero.jpg";

/** Legacy petrol list kept for older branding-preview sections. */
export const PETROL_BLUES = ACCENT_CANDIDATES.map((c) => ({
  id: c.id,
  hex: c.hex,
  name: c.name,
  namePt: c.namePt,
  vibe: c.vibe,
}));

export const DEFAULT_PETROL_BLUE = ACCENT_CANDIDATES.find((c) => c.id === "C4")!;
