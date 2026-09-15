import type { ChargingProvider, ChargingStation, EvContext } from "../types";

const STATIONS: Omit<ChargingStation, "distanceKm">[] = [
  {
    id: "sc-oeiras",
    name: "Tesla Supercharger Oeiras",
    network: "Tesla",
    lat: 38.689,
    lng: -9.318,
    powerKw: 250,
    connector: "tesla",
    pricePerKwhCents: 42,
    address: "Oeiras Parque",
    cardsAccepted: ["tesla"],
    mapsUrl: "https://www.google.com/maps/dir/?api=1&destination=38.689,-9.318",
  },
  {
    id: "mobie-cascais",
    name: "MOBI.E Cascais",
    network: "MOBI.E",
    lat: 38.697,
    lng: -9.420,
    powerKw: 50,
    connector: "ccs2",
    pricePerKwhCents: 38,
    address: "Cascais Shopping",
    cardsAccepted: ["mobie", "visa"],
    mapsUrl: "https://www.google.com/maps/dir/?api=1&destination=38.697,-9.420",
  },
  {
    id: "continente-algés",
    name: "Continente Algés — carregamento",
    network: "Continente",
    lat: 38.701,
    lng: -9.229,
    powerKw: 22,
    connector: "type2",
    pricePerKwhCents: 29,
    address: "Continente Algés",
    cardsAccepted: ["visa"],
    mapsUrl: "https://www.google.com/maps/dir/?api=1&destination=38.701,-9.229",
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

export const prototypeChargingProvider: ChargingProvider = {
  id: "ev_pt_prototype",
  label: "Carregamento PT (protótipo)",
  async search(ctx: EvContext) {
    const origin = { lat: ctx.lat ?? 38.7223, lng: ctx.lng ?? -9.1393 };
    return STATIONS.map((s) => ({
      ...s,
      distanceKm: Math.round(haversineKm(origin, s) * 10) / 10,
    })).sort((a, b) => a.distanceKm - b.distanceKm);
  },
};
