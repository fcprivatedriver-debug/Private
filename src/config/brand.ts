/**
 * ZRIK brand palette — petroleum blues for luxury European mobility.
 * Product default: Atlantic Navy (#0D3B66) — deep, elegant, tech without Uber cues.
 */
export const PETROL_BLUES = [
  {
    id: "P1",
    hex: "#0F4C5C",
    name: "Deep Teal",
    namePt: "Verde-petróleo",
    vibe: "Warm coastal · Cascais",
  },
  {
    id: "P2",
    hex: "#114B5F",
    name: "Ocean Petrol",
    namePt: "Petróleo oceânico",
    vibe: "Balanced · contemporary",
  },
  {
    id: "P3",
    hex: "#0D3B66",
    name: "Atlantic Navy",
    namePt: "Navy atlântico",
    vibe: "Luxury European · exclusive",
  },
  {
    id: "P4",
    hex: "#12355B",
    name: "Midnight Petrol",
    namePt: "Petróleo meia-noite",
    vibe: "Formal · corporate premium",
  },
] as const;

export type PetrolBlueId = (typeof PETROL_BLUES)[number]["id"];

/** Default accent used across the product UI */
export const DEFAULT_PETROL_BLUE = PETROL_BLUES.find((c) => c.id === "P3")!;

export const BRAND_INK = "#111111";
