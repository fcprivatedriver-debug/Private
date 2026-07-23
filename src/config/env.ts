import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(16),
  AUTH_TRUST_HOST: z.string().optional(),
  AUTH_GOOGLE_ID: z.string().optional(),
  AUTH_GOOGLE_SECRET: z.string().optional(),
  PAYMENTS_ENABLED: z.string().default("false"),
  PLATFORM_FEE_PERCENT: z.coerce.number().default(15),
  NEXT_PUBLIC_APP_NAME: z.string().default("Movio"),
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: z.string().optional(),
  CRON_SECRET: z.string().optional(),
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

export function platformFeePercent(): number {
  return getEnv().PLATFORM_FEE_PERCENT;
}
