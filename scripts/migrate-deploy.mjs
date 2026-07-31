#!/usr/bin/env node
/**
 * Deploy Prisma schema on Vercel.
 * FC Private Driver is a greenfield rewrite — if migrate history conflicts
 * with a previous product schema (ZRIK/Movio/etc.), fall back to db push.
 */
import { spawnSync } from "node:child_process";

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
    process.exit(pushed.code);
  }
  console.log("[migrate-deploy] db push succeeded");
}
