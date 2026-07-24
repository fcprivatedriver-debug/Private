#!/usr/bin/env node
/**
 * Deploy Prisma migrations with recovery for foreign/failed migrations (P3009)
 * and Nina schema isolation on shared Neon.
 */
import { spawnSync } from "node:child_process";
import { applyEnsureEnv } from "./ensure-env.mjs";

applyEnsureEnv({ exitOnError: true });

function run(args) {
  const res = spawnSync("npx", ["prisma", ...args], {
    encoding: "utf8",
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const out = `${res.stdout || ""}${res.stderr || ""}`;
  return { code: res.status ?? 1, out };
}

/** Ensure isolated Postgres schema exists (Nina on shared Neon with Zrik). */
function ensureSchema() {
  if (!process.env.VERCEL && process.env.FORCE_NINA_SCHEMA !== "true") {
    if (process.env.NINA_PG_SCHEMA !== "nina") return;
  }
  const schema = process.env.NINA_PG_SCHEMA || "nina";
  console.log(`[migrate-deploy] Ensuring PostgreSQL schema "${schema}"…`);
  const sql = `CREATE SCHEMA IF NOT EXISTS "${schema}";`;
  const res = spawnSync("npx", ["prisma", "db", "execute", "--stdin"], {
    encoding: "utf8",
    env: process.env,
    input: sql,
    stdio: ["pipe", "pipe", "pipe"],
  });
  const out = `${res.stdout || ""}${res.stderr || ""}`;
  process.stdout.write(out);
  if ((res.status ?? 1) !== 0) {
    console.warn(
      "[migrate-deploy] schema ensure warned (continuing):",
      out.slice(0, 400),
    );
  }
}

ensureSchema();

let result = run(["migrate", "deploy"]);
process.stdout.write(result.out);

if (result.code !== 0 && result.out.includes("20260723160000_mafil_init")) {
  console.log("[migrate-deploy] Resolving foreign failed migration mafil_init…");
  const rolled = run(["migrate", "resolve", "--rolled-back", "20260723160000_mafil_init"]);
  process.stdout.write(rolled.out);
  result = run(["migrate", "deploy"]);
  process.stdout.write(result.out);
}

if (result.code !== 0 && /P3009|migrate found failed migrations/i.test(result.out)) {
  const match = result.out.match(/`?(20\d{12}_[a-z0-9_]+)`?/i);
  if (match?.[1]) {
    console.log(`[migrate-deploy] Resolving failed migration ${match[1]}…`);
    const rolled = run(["migrate", "resolve", "--rolled-back", match[1]]);
    process.stdout.write(rolled.out);
    result = run(["migrate", "deploy"]);
    process.stdout.write(result.out);
  }
}

if (result.code !== 0) {
  process.exit(result.code);
}
