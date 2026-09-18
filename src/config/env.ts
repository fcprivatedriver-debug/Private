import { z } from "zod";
import { APP_NAME, PLATFORM_COMMISSION_PERCENT } from "@/config/constants";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1).optional(),
  AUTH_SECRET: z.string().min(16),
  AUTH_TRUST_HOST: z.string().optional(),
  AUTH_GOOGLE_ID: z.string().optional(),
  AUTH_GOOGLE_SECRET: z.string().optional(),
  PAYMENTS_ENABLED: z.string().default("false"),
  /** Canonical env key for default commission %. */
  PLATFORM_COMMISSION_PERCENT: z.coerce
    .number()
    .default(PLATFORM_COMMISSION_PERCENT),
  /** Legacy alias — prefer PLATFORM_COMMISSION_PERCENT. */
  PLATFORM_FEE_PERCENT: z.coerce.number().optional(),
  NEXT_PUBLIC_APP_NAME: z.string().default(APP_NAME),
  NEXT_PUBLIC_APP_URL: z.string().optional(),
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: z.string().optional(),
  CRON_SECRET: z.string().optional(),
  DEMO_MODE: z.string().optional(),
});

export type AppEnv = z.infer<typeof envSchema>;

export function getEnv(): AppEnv {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error(parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment variables");
  }
  return parsed.data;
}

export function paymentsEnabled(): boolean {
  return getEnv().PAYMENTS_ENABLED === "true";
}

/** Resolved default commission % (env → canonical constant). */
export function platformCommissionPercent(): number {
  const env = getEnv();
  if (env.PLATFORM_FEE_PERCENT !== undefined) {
    return env.PLATFORM_FEE_PERCENT;
  }
  return env.PLATFORM_COMMISSION_PERCENT;
}

/** @deprecated Use platformCommissionPercent */
export function platformFeePercent(): number {
  return platformCommissionPercent();
}
