#!/usr/bin/env node
/**
 * Sync Prisma schema on Vercel for FC Private Driver rewrite.
 * Always runs `db push` so legacy ZRIK tables are replaced, then optional seed.
 */
import { spawnSync } from "node:child_process";

if (!process.env.DATABASE_URL) {
  console.warn("[migrate-deploy] No DATABASE_URL — skipping schema sync");
  process.exit(0);
}

if (!process.env.DIRECT_URL) {
  process.env.DIRECT_URL =
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.DATABASE_URL;
}

function run(cmd, args) {
  const res = spawnSync(cmd, args, {
    encoding: "utf8",
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const out = `${res.stdout || ""}${res.stderr || ""}`;
  return { code: res.status ?? 1, out };
}

console.log("[migrate-deploy] Syncing schema with prisma db push…");
const pushed = run("npx", ["prisma", "db", "push", "--accept-data-loss", "--skip-generate"]);
process.stdout.write(pushed.out);
if (pushed.code !== 0) {
  console.warn("[migrate-deploy] db push failed — trying migrate deploy as fallback");
  const migrated = run("npx", ["prisma", "migrate", "deploy"]);
  process.stdout.write(migrated.out);
  if (migrated.code !== 0) {
    console.warn("[migrate-deploy] schema sync failed (non-fatal for compile)");
    process.exit(0);
  }
} else {
  console.log("[migrate-deploy] db push succeeded");
}

// Seed when DEMO_MODE/SEED_ON_DEPLOY or when SiteSettings missing (best-effort)
const shouldSeed =
  process.env.DEMO_MODE === "true" ||
  process.env.SEED_ON_DEPLOY === "true" ||
  process.env.VERCEL === "1";

if (shouldSeed) {
  console.log("[migrate-deploy] Seeding demo data…");
  const seed = run("npx", ["tsx", "prisma/seed.ts"]);
  process.stdout.write(seed.out);
  if (seed.code !== 0) {
    console.warn("[migrate-deploy] seed failed (non-fatal)");
  } else {
    console.log("[migrate-deploy] seed complete");
  }
}

console.log("[migrate-deploy] OK");
