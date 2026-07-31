/**
 * Google Maps API key resolution.
 *
 * Canonical (Next.js): NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
 * Also accepted (server / misnamed envs on Vercel):
 *   GOOGLE_MAPS_API_KEY, VITE_GOOGLE_MAPS_API_KEY
 */
export const GOOGLE_MAPS_ENV_NAMES = [
  "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY",
  "GOOGLE_MAPS_API_KEY",
  "VITE_GOOGLE_MAPS_API_KEY",
] as const;

export function getGoogleMapsApiKey(): string | undefined {
  for (const name of GOOGLE_MAPS_ENV_NAMES) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return undefined;
}

export function isGoogleMapsConfigured(): boolean {
  return Boolean(getGoogleMapsApiKey());
}

/** Which env name provided the key (for diagnostics — never the value). */
export function getGoogleMapsApiKeySource(): string | null {
  for (const name of GOOGLE_MAPS_ENV_NAMES) {
    if (process.env[name]?.trim()) return name;
  }
  return null;
}
