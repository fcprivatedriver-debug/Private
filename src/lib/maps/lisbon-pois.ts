import type { PlaceSuggestion } from "./place-types";

export type { PlaceSuggestion } from "./place-types";

/**
 * Curated Lisbon / Cascais POIs for chauffeur booking.
 * Guarantees aeroporto, gares, terminais and landmarks appear even when
 * Google returns only street geocodes.
 */
export type CuratedPoi = PlaceSuggestion & {
  aliases: string[];
};

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export const LISBON_CURATED_POIS: CuratedPoi[] = [
  {
    placeId: "zelu:lis-airport",
    description: "Aeroporto Humberto Delgado (Lisboa), Olivais, Lisboa",
    lat: 38.775593,
    lng: -9.135367,
    aliases: [
      "aeroporto de lisboa",
      "aeroporto lisboa",
      "aeroporto humberto delgado",
      "humberto delgado",
      "lisbon airport",
      "lisboa airport",
      "airport lisbon",
      "lis airport",
      "aeroporto",
      "airport",
    ],
  },
  {
    placeId: "zelu:oriente-station",
    description: "Estação / Gare do Oriente, Parque das Nações, Lisboa",
    lat: 38.767849,
    lng: -9.0990726,
    aliases: [
      "estacao do oriente",
      "estação do oriente",
      "gare do oriente",
      "oriente station",
      "lisboa oriente",
      "estacao oriente",
      "oriente",
    ],
  },
  {
    placeId: "zelu:santa-apolonia",
    description: "Estação de Santa Apolónia, Lisboa",
    lat: 38.7139,
    lng: -9.1225,
    aliases: ["santa apolonia", "estação santa apolónia", "estacao santa apolonia", "apolonia"],
  },
  {
    placeId: "zelu:rossio-station",
    description: "Estação do Rossio, Lisboa",
    lat: 38.7140244,
    lng: -9.1415,
    aliases: ["estacao do rossio", "estação do rossio", "rossio station"],
  },
  {
    placeId: "zelu:cais-sodre",
    description: "Cais do Sodré (estação / terminal), Lisboa",
    lat: 38.7061,
    lng: -9.1435,
    aliases: ["cais do sodre", "cais do sodré", "cais sodre", "sodre station"],
  },
  {
    placeId: "zelu:cruise-terminal",
    description: "Terminal de Cruzeiros de Lisboa, Jardim do Tabaco, Lisboa",
    lat: 38.7125,
    lng: -9.1245,
    aliases: [
      "terminal de cruzeiros",
      "terminal cruzeiros lisboa",
      "cruise terminal lisbon",
      "terminal de cruzeiros de lisboa",
    ],
  },
  {
    placeId: "zelu:sete-rios",
    description: "Sete Rios (estação / terminal), Lisboa",
    lat: 38.7485,
    lng: -9.1668,
    aliases: ["sete rios", "estação sete rios", "terminal sete rios"],
  },
  {
    placeId: "zelu:oriente-bus",
    description: "Terminal Rodoviário do Oriente, Parque das Nações, Lisboa",
    lat: 38.7682,
    lng: -9.0985,
    aliases: ["terminal rodoviario oriente", "terminal rodoviário do oriente", "bus terminal oriente"],
  },
  {
    placeId: "zelu:cascais-marina",
    description: "Marina de Cascais, Cascais",
    lat: 38.6936,
    lng: -9.4205,
    aliases: ["marina de cascais", "cascais marina"],
  },
  {
    placeId: "zelu:parque-nacoes",
    description: "Parque das Nações, Lisboa",
    lat: 38.7681,
    lng: -9.0975,
    aliases: ["parque das nacoes", "parque das nações", "park of nations"],
  },
];

export function matchCuratedPois(query: string, limit = 5): PlaceSuggestion[] {
  const q = normalize(query);
  if (q.length < 2) return [];

  const scored = LISBON_CURATED_POIS.map((poi) => {
    let score = 0;
    const desc = normalize(poi.description);
    for (const alias of poi.aliases) {
      const a = normalize(alias);
      if (q === a) score = Math.max(score, 100);
      else if (a.startsWith(q) || q.startsWith(a)) score = Math.max(score, 90);
      else if (a.includes(q) || q.includes(a)) score = Math.max(score, 75);
    }
    if (desc.includes(q)) score = Math.max(score, 60);
    return { poi, score };
  })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map(({ poi }) => ({
    placeId: poi.placeId,
    description: poi.description,
    lat: poi.lat,
    lng: poi.lng,
  }));
}

export function getCuratedPoiById(placeId: string): PlaceSuggestion | null {
  const hit = LISBON_CURATED_POIS.find((p) => p.placeId === placeId);
  if (!hit) return null;
  return {
    placeId: hit.placeId,
    description: hit.description,
    lat: hit.lat,
    lng: hit.lng,
  };
}

/** Merge suggestion lists, preferring curated → google → nominatim, de-duped. */
export function mergePlaceSuggestions(
  ...lists: PlaceSuggestion[][]
): PlaceSuggestion[] {
  const seen = new Set<string>();
  const out: PlaceSuggestion[] = [];

  for (const list of lists) {
    for (const item of list) {
      const key = normalize(item.description).slice(0, 80);
      const idKey = item.placeId;
      if (seen.has(idKey) || seen.has(key)) continue;
      seen.add(idKey);
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}
