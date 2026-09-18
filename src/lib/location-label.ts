/**
 * Consistent short labels for trip cards.
 * Full addresses stay in the DB and on detail pages — never mutate stored data.
 */

function isStreetLike(segment: string): boolean {
  return /^(rua|r\.|av\.?|avenida|travessa|estrada|largo|praça|praceta|alameda|calçada|beco|urbanização|urb\.)\b/i.test(
    segment.trim(),
  );
}

function isNoiseSegment(segment: string): boolean {
  const s = segment.trim();
  if (!s) return true;
  if (/^(portugal|pt)$/i.test(s)) return true;
  if (/^\d{4}(-\d{3})?$/.test(s)) return true; // postal code alone
  if (/^\d+$/.test(s)) return true;
  return false;
}

/** "2745-123 Sintra" → "Sintra" */
function stripPostalPrefix(segment: string): string {
  return segment.replace(/^\d{4}(?:-\d{3})?\s+/, "").trim() || segment.trim();
}

/**
 * Compact place name for list cards (e.g. "Aeroporto de Lisboa", "Massamá").
 */
export function shortLocationLabel(address: string, maxLen = 42): string {
  const raw = (address || "").trim();
  if (!raw) return "—";

  const parts = raw
    .split(",")
    .map((p) => stripPostalPrefix(p.trim()))
    .filter((p) => p && !isNoiseSegment(p));

  if (parts.length === 0) {
    return truncateLabel(raw, maxLen);
  }

  const first = parts[0]!;
  // Street address → prefer nearby locality (2nd segment) over municipality/city at end
  if (isStreetLike(first) && parts.length >= 2) {
    const locality = parts[1]!;
    if (locality.length <= 36) return truncateLabel(locality, maxLen);
    const last = parts[parts.length - 1]!;
    return truncateLabel(last, maxLen);
  }

  // POI / airport / named place → first segment
  return truncateLabel(first, maxLen);
}

export function truncateLabel(text: string, maxLen: number): string {
  const t = text.trim();
  if (t.length <= maxLen) return t;
  const cut = t.slice(0, maxLen - 1).replace(/\s+\S*$/, "");
  return `${cut || t.slice(0, maxLen - 1)}…`;
}

/** Route summary: "Aeroporto de Lisboa → Massamá" */
export function shortRouteLabel(pickup: string, dropoff: string): string {
  return `${shortLocationLabel(pickup)} → ${shortLocationLabel(dropoff)}`;
}

/** First public given name only (pre-payment). */
export function publicFirstName(fullName: string | null | undefined, fallback = "Motorista"): string {
  const name = (fullName || "").trim();
  if (!name) return fallback;
  return name.split(/\s+/)[0] || fallback;
}
