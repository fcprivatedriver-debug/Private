#!/usr/bin/env node
/**
 * Deploy Prisma schema on Vercel.
 * Soft-skip without DATABASE_URL. Fall back to db push on migrate conflicts.
 */
import { spawnSync } from "node:child_process";

if (!process.env.DATABASE_URL) {
  console.warn("[migrate-deploy] No DATABASE_URL — skipping migrations");
  process.exit(0);
}

if (!process.env.DIRECT_URL) {
  process.env.DIRECT_URL =
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.DATABASE_URL;
}

function run(args) {
  const res = spawnSync("npx", ["prisma", ...args], {
    encoding: "utf8",
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const out = `${res.stdout || ""}${res.stderr || ""}`;
  return { code: res.status ?? 1, out };
}

let result = run(["migrate", "deploy"]);
process.stdout.write(result.out);

if (result.code !== 0 && result.out.includes("20260723160000_mafil_init")) {
  console.log("[migrate-deploy] Resolving foreign failed migration mafil_init…");
  const rolled = run(["migrate", "resolve", "--rolled-back", "20260723160000_mafil_init"]);
  process.stdout.write(rolled.out);
  result = run(["migrate", "deploy"]);
  process.stdout.write(result.out);
}

if (result.code !== 0) {
  console.log(
    "[migrate-deploy] migrate deploy failed — attempting prisma db push (schema rewrite recovery)…",
  );
  const pushed = run(["db", "push", "--accept-data-loss", "--skip-generate"]);
  process.stdout.write(pushed.out);
  if (pushed.code !== 0) {
    console.warn("[migrate-deploy] db push also failed — continuing build");
    process.exit(0);
  }
  console.log("[migrate-deploy] db push succeeded");
}

if (process.env.DEMO_MODE === "true" || process.env.SEED_ON_DEPLOY === "true") {
  console.log("[migrate-deploy] DEMO_MODE/SEED_ON_DEPLOY — running seed…");
  const seed = spawnSync("npx", ["tsx", "prisma/seed.ts"], {
    encoding: "utf8",
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  process.stdout.write(`${seed.stdout || ""}${seed.stderr || ""}`);
  if ((seed.status ?? 1) !== 0) {
    console.warn("[migrate-deploy] seed failed (non-fatal for build)");
  }
}
