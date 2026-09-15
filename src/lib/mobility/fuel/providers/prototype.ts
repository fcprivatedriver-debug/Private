import type { FuelProvider, FuelStation, FuelQuoteContext } from "../types";

/** Protótipo PT — substituível por API DGEG / redes oficiais. */
const STATIONS: Omit<FuelStation, "distanceKm">[] = [
  {
    id: "bp-oeiras",
    name: "BP Oeiras",
    brand: "BP",
    fuelType: "petrol",
    pricePerLitreCents: 1699,
    lat: 38.691,
    lng: -9.312,
    address: "Av. Marginal, Oeiras",
    cardsAccepted: ["bp", "visa"],
    mapsUrl: "https://www.google.com/maps/dir/?api=1&destination=38.691,-9.312",
  },
  {
    id: "repsol-cascais",
    name: "Repsol Cascais",
    brand: "Repsol",
    fuelType: "petrol",
    pricePerLitreCents: 1679,
    lat: 38.697,
    lng: -9.421,
    address: "N6 Cascais",
    cardsAccepted: ["repsol", "visa"],
    mapsUrl: "https://www.google.com/maps/dir/?api=1&destination=38.697,-9.421",
  },
  {
    id: "prio-algés",
    name: "Prio Algés",
    brand: "Prio",
    fuelType: "diesel",
    pricePerLitreCents: 1549,
    lat: 38.700,
    lng: -9.230,
    address: "Algés",
    cardsAccepted: ["prio", "visa"],
    mapsUrl: "https://www.google.com/maps/dir/?api=1&destination=38.700,-9.230",
  },
  {
    id: "galp-lx",
    name: "Galp Lisboa Norte",
    brand: "Galp",
    fuelType: "diesel",
    pricePerLitreCents: 1569,
    lat: 38.760,
    lng: -9.150,
    address: "2ª Circular",
    cardsAccepted: ["galp", "visa"],
    mapsUrl: "https://www.google.com/maps/dir/?api=1&destination=38.760,-9.150",
  },
];

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export const prototypeFuelProvider: FuelProvider = {
  id: "pt_prototype",
  label: "Postos PT (protótipo)",
  async search(ctx: FuelQuoteContext) {
    const origin = { lat: ctx.lat ?? 38.7223, lng: ctx.lng ?? -9.1393 };
    return STATIONS.filter((s) => s.fuelType === ctx.fuelType)
      .map((s) => ({
        ...s,
        distanceKm: Math.round(haversineKm(origin, s) * 10) / 10,
      }))
      .sort((a, b) => a.pricePerLitreCents - b.pricePerLitreCents || a.distanceKm - b.distanceKm);
  },
};
