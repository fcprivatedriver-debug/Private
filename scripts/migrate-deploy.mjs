#!/usr/bin/env node
/**
 * Deploy Prisma migrations. On shared Neon, ensure schema `mel` exists first.
 */
import { spawnSync } from "node:child_process";

function run(args, env = process.env) {
  const res = spawnSync("npx", ["prisma", ...args], {
    encoding: "utf8",
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const out = `${res.stdout || ""}${res.stderr || ""}`;
  return { code: res.status ?? 1, out };
}

function ensureMelSchema() {
  const schema =
    process.env.MEL_PG_SCHEMA ||
    (process.env.VERCEL ? "mel" : null) ||
    (process.env.FORCE_MEL_SCHEMA === "true" ? "mel" : null);
  if (!schema) return;

  const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!url) return;

  console.log(`[migrate-deploy] Ensuring Postgres schema "${schema}"…`);
  const sql = `CREATE SCHEMA IF NOT EXISTS "${schema}";`;
  const res = spawnSync(
    "psql",
    [url, "-v", "ON_ERROR_STOP=1", "-c", sql],
    { encoding: "utf8" },
  );
  if (res.status !== 0) {
    console.warn("[migrate-deploy] psql schema ensure skipped/failed:", res.stderr || res.stdout);
  }
}

ensureMelSchema();

let result = run(["migrate", "deploy"]);
process.stdout.write(result.out);

if (result.code !== 0) {
  process.exit(result.code);
}
