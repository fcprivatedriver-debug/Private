#!/usr/bin/env node
/**
 * Ensure Prisma DIRECT_URL exists before migrate deploy.
 * Vercel Neon integration injects DATABASE_URL (+ often DATABASE_URL_UNPOOLED),
 * but not DIRECT_URL — which our schema requires.
 */
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
    "movio-demo-auth-secret-do-not-use-in-real-prod-32b";
  console.log("[ensure-env] AUTH_SECRET set to demo fallback for this build");
}

// Neon + Prisma Migrate: prefer unpooled URL without channel_binding
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
