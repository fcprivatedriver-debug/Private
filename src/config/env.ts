import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1).optional(),
  DIRECT_URL: z.string().min(1).optional(),
  AUTH_SECRET: z.string().optional(),
  NEXT_PUBLIC_APP_NAME: z.string().optional(),
  DEMO_MODE: z.string().optional(),
});

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  DIRECT_URL: process.env.DIRECT_URL,
  AUTH_SECRET: process.env.AUTH_SECRET,
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  DEMO_MODE: process.env.DEMO_MODE,
});

export const isDemoMode =
  process.env.DEMO_MODE === "true" || process.env.NODE_ENV !== "production";
