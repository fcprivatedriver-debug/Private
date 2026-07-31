#!/usr/bin/env node
/**
 * Deploy Prisma migrations for ZELU (public schema).
 *
 * Shared Neon may contain failed / foreign migrations from other apps
 * (Mafil, Mel) that block `prisma migrate deploy` with P3009.
 * We resolve those as rolled-back when they are NOT part of this app's
 * migration history, then retry deploy.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const KNOWN_FOREIGN = [
  "20260723160000_mafil_init",
  "20260727160000_mel_init",
];

function localMigrationNames() {
  const dir = join(process.cwd(), "prisma", "migrations");
  if (!existsSync(dir)) return new Set();
  return new Set(
    readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name),
  );
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

function extractFailedMigration(out) {
  // Prisma P3009: "migrate found failed migrations in the target database: `NAME`"
  const patterns = [
    /failed migrations in the target database:\s*`([^`]+)`/i,
    /The `([^`]+)` migration.*?failed/i,
    /Migration[`'\s]+([0-9]{14}_[A-Za-z0-9_]+)/,
  ];
  for (const re of patterns) {
    const m = out.match(re);
    if (m?.[1]) return m[1];
  }
  return null;
}

function resolveRolledBack(name) {
  console.log(`[migrate-deploy] Resolving foreign/failed migration as rolled-back: ${name}`);
  return run(["migrate", "resolve", "--rolled-back", name]);
}

const ours = localMigrationNames();
console.log(
  `[migrate-deploy] Local migrations: ${[...ours].sort().join(", ") || "(none)"}`,
);

let result = run(["migrate", "deploy"]);
process.stdout.write(result.out);

if (result.code !== 0) {
  const failed = extractFailedMigration(result.out);
  const toResolve = new Set();

  for (const name of KNOWN_FOREIGN) {
    if (result.out.includes(name) && !ours.has(name)) toResolve.add(name);
  }
  if (failed && !ours.has(failed)) toResolve.add(failed);

  // P3009 without parseable name — try all known foreign
  if (result.out.includes("P3009") && toResolve.size === 0) {
    for (const name of KNOWN_FOREIGN) {
      if (!ours.has(name)) toResolve.add(name);
    }
  }

  if (toResolve.size > 0) {
    for (const name of toResolve) {
      const rolled = resolveRolledBack(name);
      process.stdout.write(rolled.out);
    }
    result = run(["migrate", "deploy"]);
    process.stdout.write(result.out);
  }
}

if (result.code !== 0) {
  console.error("[migrate-deploy] FAILED — see Prisma output above");
  process.exit(result.code);
}

console.log("[migrate-deploy] OK");
