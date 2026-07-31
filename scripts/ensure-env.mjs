#!/usr/bin/env node
/**
 * Ensure Prisma DIRECT_URL exists before migrate deploy.
 * Soft-fail when DATABASE_URL is missing (e.g. preview without Neon).
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
    "fc-private-driver-demo-auth-secret-32chars";
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
  console.warn(
    "[ensure-env] DATABASE_URL missing — build continues; runtime pages that need DB will fail until Neon is linked.",
  );
  process.exit(0);
}

if (!process.env.DIRECT_URL) {
  process.env.DIRECT_URL = process.env.DATABASE_URL;
  console.log("[ensure-env] DIRECT_URL mirrored from DATABASE_URL");
} else {
  process.env.DIRECT_URL = stripChannelBinding(process.env.DIRECT_URL);
}
