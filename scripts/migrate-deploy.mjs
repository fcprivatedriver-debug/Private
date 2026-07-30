#!/usr/bin/env node
/**
 * Deploy Prisma migrations with recovery for known foreign / blocked migrations
 * that can fail Vercel builds (P3009).
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

const KNOWN_FOREIGN = ["20260723160000_mafil_init"];

let result = run(["migrate", "deploy"]);
process.stdout.write(result.out);

if (result.code !== 0) {
  for (const name of KNOWN_FOREIGN) {
    if (result.out.includes(name)) {
      console.log(`[migrate-deploy] Resolving foreign failed migration ${name}…`);
      const rolled = run(["migrate", "resolve", "--rolled-back", name]);
      process.stdout.write(rolled.out);
    }
  }

  // Generic P3009: extract failed migration id if present
  const match = result.out.match(/Migration[`'\s]+([0-9]+_[A-Za-z0-9_]+)/);
  if (match && !KNOWN_FOREIGN.includes(match[1]) && result.out.includes("P3009")) {
    console.log(`[migrate-deploy] Resolving blocked migration ${match[1]}…`);
    const rolled = run(["migrate", "resolve", "--rolled-back", match[1]]);
    process.stdout.write(rolled.out);
  }

  result = run(["migrate", "deploy"]);
  process.stdout.write(result.out);
}

if (result.code !== 0) {
  console.error("[migrate-deploy] FAILED");
  process.exit(result.code);
}

console.log("[migrate-deploy] OK");
