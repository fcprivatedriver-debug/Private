/**
 * ZRIK brand — production locks + Homepage Lab candidates.
 */

export const BRAND_INK = "#111111";

export const ACCENT_CANDIDATES = [
  {
    id: "C1",
    hex: "#1F5A96",
    name: "Azure Prestige",
    namePt: "Azul prestígio",
    vibe: "Product accent",
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
 * Slogan candidates — marketplace: publish trip → receive offers → choose the best.
 * Never medical / “médico”. Option D is the user’s favorite (not locked yet).
 */
export const SLOGAN_CANDIDATES = [
  {
    id: "A",
    line1Pt: "Escolhe o melhor motorista.",
    line2Pt: "Escolhe o melhor preço.",
    line1En: "Choose the best driver.",
    line2En: "Choose the best price.",
    favorite: false,
  },
  {
    id: "B",
    line1Pt: "Escolhe o melhor serviço.",
    line2Pt: "Escolhe o melhor preço.",
    line1En: "Choose the best service.",
    line2En: "Choose the best price.",
    favorite: false,
  },
  {
    id: "C",
    line1Pt: "Escolhe a melhor viagem.",
    line2Pt: "Escolhe o melhor preço.",
    line1En: "Choose the best trip.",
    line2En: "Choose the best price.",
    favorite: false,
  },
  {
    id: "D",
    line1Pt: "Tu escolhes.",
    line2Pt: "O resto é connosco.",
    line1En: "You choose.",
    line2En: "We handle the rest.",
    favorite: true,
  },
  {
    id: "E1",
    line1Pt: "Pedidos abertos.",
    line2Pt: "Propostas à sua escolha.",
    line1En: "Open requests.",
    line2En: "Offers you control.",
    favorite: false,
  },
  {
    id: "E2",
    line1Pt: "Receba propostas.",
    line2Pt: "Aceite a melhor.",
    line1En: "Receive offers.",
    line2En: "Accept the best.",
    favorite: false,
  },
  {
    id: "E3",
    line1Pt: "O seu trajeto.",
    line2Pt: "As melhores propostas.",
    line1En: "Your route.",
    line2En: "The best offers.",
    favorite: false,
  },
  {
    id: "E4",
    line1Pt: "Mobilidade sob o seu critério.",
    line2Pt: "Preço sob o seu controlo.",
    line1En: "Mobility on your terms.",
    line2En: "Price under your control.",
    favorite: false,
  },
  {
    id: "E5",
    line1Pt: "Uma viagem. Várias propostas.",
    line2Pt: "Uma escolha sua.",
    line1En: "One trip. Several offers.",
    line2En: "One choice — yours.",
    favorite: false,
  },
] as const;

export type SloganId = (typeof SLOGAN_CANDIDATES)[number]["id"];

/**
 * Full-bleed Cascais Marina campaign photographs.
 * Photo IS the scene — not a side panel. No people, doors closed.
 */
export const HERO_VERSIONS = [
  {
    id: "FB1",
    src: "/brand/zrik-hero-fb1.jpg",
    title: "FB1 — Graphite · Cascais",
    titlePt: "FB1 — Graphite · Cascais",
    desc: "Dark Model 3 · full car · marina atmosphere · golden hour",
    descPt: "Model 3 escuro · carro completo · marina · golden hour",
    mood: "Coastal · discreet",
    moodPt: "Costeira · discreta",
  },
  {
    id: "FB2",
    src: "/brand/zrik-hero-fb2.jpg",
    title: "FB2 — White · Cascais",
    titlePt: "FB2 — Branco · Cascais",
    desc: "White Model 3 · parked · marina backdrop soft · luminous",
    descPt: "Model 3 branco · estacionado · marina suave · luminoso",
    mood: "Open · bright",
    moodPt: "Aberta · luminosa",
  },
  {
    id: "FB3",
    src: "/brand/zrik-hero-fb3.jpg",
    title: "FB3 — Black · Cascais",
    titlePt: "FB3 — Preto · Cascais",
    desc: "Black Model 3 · almost full side · quiet marina · campaign grade",
    descPt: "Model 3 preto · quase completo · marina quieta · nível campanha",
    mood: "Cinematic · decisive",
    moodPt: "Cinematográfica · decisiva",
  },
] as const;

export type HeroVersionId = (typeof HERO_VERSIONS)[number]["id"];

export const OVERLAY_CANDIDATES = [
  { id: "O50", label: "50%", value: 0.5 },
  { id: "O55", label: "55%", value: 0.55 },
  { id: "O60", label: "60%", value: 0.6 },
] as const;

export const HERO_PHOTO_CANDIDATES = HERO_VERSIONS;
export type HeroPhotoId = HeroVersionId;

/** Production scene: FB3 black Cascais (full-bleed). */
export const LOCKED_HERO_VERSION = HERO_VERSIONS.find((v) => v.id === "FB3")!;

/** Slogan favorite D until otherwise locked */
export const PRODUCTION_SLOGAN = SLOGAN_CANDIDATES.find((s) => s.id === "D")!;

export const PRODUCTION_ACCENT = "#1F5A96";
export const PRODUCTION_ACCENT_STRONG = "#184a7c";
export const PRODUCTION_HERO = LOCKED_HERO_VERSION.src;
/** Light veil — photo remains the atmosphere */
export const PRODUCTION_OVERLAY = 0.52;

export const PETROL_BLUES = ACCENT_CANDIDATES.map((c) => ({
  id: c.id,
  hex: c.hex,
  name: c.name,
  namePt: c.namePt,
  vibe: c.vibe,
}));

export const DEFAULT_PETROL_BLUE = ACCENT_CANDIDATES[0]!;
