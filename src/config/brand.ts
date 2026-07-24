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
 * People-free editorial hero photographs (no clients, no drivers in frame).
 */
export const HERO_VERSIONS = [
  {
    id: "NP1",
    src: "/brand/zrik-hero-np1.jpg",
    title: "NP1 — Graphite stillness",
    titlePt: "NP1 — Quietude graphite",
    desc: "Dark Model 3 · empty hotel drop-off · no people · golden hour",
    descPt: "Model 3 escuro · hotel vazio · sem pessoas · golden hour",
    mood: "Discreet · atmospheric",
    moodPt: "Discreta · atmosférica",
  },
  {
    id: "NP2",
    src: "/brand/zrik-hero-np2.jpg",
    title: "NP2 — Open door waiting",
    titlePt: "NP2 — Porta aberta à espera",
    desc: "Black Model 3 · open empty cabin · experience without people",
    descPt: "Model 3 preto · habitáculo vazio · experiência sem pessoas",
    mood: "Inviting · cinematic",
    moodPt: "Convidativa · cinematográfica",
  },
  {
    id: "NP3",
    src: "/brand/zrik-hero-np3.jpg",
    title: "NP3 — White arrival",
    titlePt: "NP3 — Chegada em branco",
    desc: "White Model 3 · deserted porte-cochère · bright European air",
    descPt: "Model 3 branco · porte-cochère deserto · luz europeia",
    mood: "Luminous · pure",
    moodPt: "Luminosa · pura",
  },
] as const;

export type HeroVersionId = (typeof HERO_VERSIONS)[number]["id"];

export const OVERLAY_CANDIDATES = [
  { id: "O55", label: "55%", value: 0.55 },
  { id: "O60", label: "60%", value: 0.6 },
  { id: "O65", label: "65%", value: 0.65 },
] as const;

export const HERO_PHOTO_CANDIDATES = HERO_VERSIONS;
export type HeroPhotoId = HeroVersionId;

/** Interim production: people-free NP2 until a new winner is chosen */
export const LOCKED_HERO_VERSION = HERO_VERSIONS.find((v) => v.id === "NP2")!;

/** Slogan not locked — production uses favorite D for now (still changeable in Lab) */
export const PRODUCTION_SLOGAN = SLOGAN_CANDIDATES.find((s) => s.id === "D")!;

export const PRODUCTION_ACCENT = "#1F5A96";
export const PRODUCTION_ACCENT_STRONG = "#184a7c";
export const PRODUCTION_HERO = LOCKED_HERO_VERSION.src;
export const PRODUCTION_OVERLAY = 0.55;

export const PETROL_BLUES = ACCENT_CANDIDATES.map((c) => ({
  id: c.id,
  hex: c.hex,
  name: c.name,
  namePt: c.namePt,
  vibe: c.vibe,
}));

export const DEFAULT_PETROL_BLUE = ACCENT_CANDIDATES[0]!;
