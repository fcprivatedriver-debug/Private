#!/usr/bin/env node
/**
 * Deploy Prisma migrations with recovery for a known foreign failed migration
 * (`20260723160000_mafil_init`) that can block Vercel builds (P3009).
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
  process.exit(result.code);
}
