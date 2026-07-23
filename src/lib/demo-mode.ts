export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === "true" || process.env.NODE_ENV === "development";
}

export const DEMO_PASSWORD = "mafil123";
