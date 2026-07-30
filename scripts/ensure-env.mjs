#!/usr/bin/env node
/**
 * Ensure Prisma DIRECT_URL exists before migrate deploy.
 * Vercel Neon integration injects DATABASE_URL (+ often DATABASE_URL_UNPOOLED),
 * but not DIRECT_URL — which our schema requires.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadDotEnv() {
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

loadDotEnv();

if (!process.env.DIRECT_URL) {
  process.env.DIRECT_URL =
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.DATABASE_URL ||
    "";
  if (process.env.DIRECT_URL) {
    console.log(
      "[ensure-env] DIRECT_URL derived from",
      process.env.DATABASE_URL_UNPOOLED
        ? "DATABASE_URL_UNPOOLED"
        : process.env.POSTGRES_URL_NON_POOLING
          ? "POSTGRES_URL_NON_POOLING"
          : "DATABASE_URL",
    );
  }
}

if (!process.env.AUTH_SECRET && !process.env.NEXTAUTH_SECRET) {
  process.env.AUTH_SECRET =
    "mel-demo-auth-secret-do-not-use-in-real-prod-32b";
  console.log("[ensure-env] AUTH_SECRET set to demo fallback for this build");
}

function stripChannelBinding(url) {
  try {
    const u = new URL(url);
    u.searchParams.delete("channel_binding");
    return u.toString();
  } catch {
    return String(url).replace(/&?channel_binding=require/g, "");
  }
}

if (process.env.DATABASE_URL) {
  process.env.DATABASE_URL = stripChannelBinding(process.env.DATABASE_URL);
}
if (process.env.DIRECT_URL) {
  process.env.DIRECT_URL = stripChannelBinding(process.env.DIRECT_URL);
}
if (process.env.DATABASE_URL_UNPOOLED) {
  process.env.DATABASE_URL_UNPOOLED = stripChannelBinding(
    process.env.DATABASE_URL_UNPOOLED,
  );
}

if (!process.env.DATABASE_URL) {
  console.error(
    "[ensure-env] DATABASE_URL is missing. Connect Neon in Vercel Storage, or set DATABASE_URL.",
  );
  process.exit(1);
}

if (!process.env.DIRECT_URL) {
  console.error("[ensure-env] Could not resolve DIRECT_URL");
  process.exit(1);
} else {
  process.env.DIRECT_URL = stripChannelBinding(process.env.DIRECT_URL);
}
