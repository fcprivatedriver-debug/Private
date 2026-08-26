import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatEuros(cents: number, locale = "pt-PT") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

export function formatMinutes(minutes: number) {
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  if (h === 0) return `${minutes < 0 ? "-" : ""}${m} min`;
  if (m === 0) return `${minutes < 0 ? "-" : ""}${h} h`;
  return `${minutes < 0 ? "-" : ""}${h} h ${m} min`;
}

export function availableMinutes(sub: {
  minutesIncluded: number;
  minutesUsed: number;
  minutesReserved: number;
}) {
  return Math.max(0, sub.minutesIncluded - sub.minutesUsed - sub.minutesReserved);
}

export function usagePercent(sub: {
  minutesIncluded: number;
  minutesUsed: number;
  minutesReserved: number;
}) {
  if (sub.minutesIncluded <= 0) return 0;
  return Math.min(
    100,
    Math.round(((sub.minutesUsed + sub.minutesReserved) / sub.minutesIncluded) * 100),
  );
}

export function whatsappLink(phoneE164: string, text?: string) {
  const n = phoneE164.replace(/[^\d]/g, "");
  const q = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://wa.me/${n}${q}`;
}

export function apiError(code: string, message: string, status = 400) {
  return Response.json({ error: { code, message } }, { status });
}
