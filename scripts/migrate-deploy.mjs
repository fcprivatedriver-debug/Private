#!/usr/bin/env node
/**
 * Deploy Prisma migrations for Mel on shared Neon.
 * Always targets schema `mel` — never mutates ZRIK's `public` schema.
 */
import { spawnSync } from "node:child_process";

const MEL_SCHEMA = "mel";
const MEL_MIGRATION = "20260727160000_mel_init";

function stripChannelBinding(url) {
  try {
    const u = new URL(url);
    u.searchParams.delete("channel_binding");
    return u.toString();
  } catch {
    return String(url).replace(/&?channel_binding=require/g, "");
  }
}

function withMelSchema(url) {
  try {
    const u = new URL(url);
    u.searchParams.delete("channel_binding");
    u.searchParams.set("schema", MEL_SCHEMA);
    if (u.hostname.includes("neon.tech") && !u.searchParams.has("sslmode")) {
      u.searchParams.set("sslmode", "require");
    }
    return u.toString();
  } catch {
    return url;
  }
}

/** Force Mel schema on connection URLs so migrate never reads ZRIK public history. */
function forceMelConnectionEnv() {
  if (process.env.DATABASE_URL) {
    process.env.DATABASE_URL = withMelSchema(
      stripChannelBinding(process.env.DATABASE_URL),
    );
  }
  if (!process.env.DIRECT_URL) {
    process.env.DIRECT_URL =
      process.env.DATABASE_URL_UNPOOLED ||
      process.env.POSTGRES_URL_NON_POOLING ||
      process.env.DATABASE_URL ||
      "";
  }
  if (process.env.DIRECT_URL) {
    process.env.DIRECT_URL = withMelSchema(
      stripChannelBinding(process.env.DIRECT_URL),
    );
  }
  process.env.MEL_PG_SCHEMA = MEL_SCHEMA;
  console.log(
    `[migrate-deploy] Target schema="${MEL_SCHEMA}" (shared Neon; ZRIK stays in public)`,
  );
}

function run(args, input) {
  const res = spawnSync("npx", ["prisma", ...args], {
    encoding: "utf8",
    env: process.env,
    input: input ?? undefined,
    stdio: ["pipe", "pipe", "pipe"],
  });
  const out = `${res.stdout || ""}${res.stderr || ""}`;
  return { code: res.status ?? 1, out };
}

/** Create schema via prisma db execute — no psql binary required on Vercel. */
function ensureMelSchema() {
  console.log(`[migrate-deploy] Ensuring Postgres schema "${MEL_SCHEMA}"…`);
  const sql = `CREATE SCHEMA IF NOT EXISTS "${MEL_SCHEMA}";`;
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
  const res = run(["db", "execute", "--url", url, "--stdin"], sql);
  if (res.code !== 0) {
    // Migration SQL also has CREATE SCHEMA IF NOT EXISTS — warn only
    console.warn("[migrate-deploy] schema ensure warn:", res.out.slice(0, 400));
  } else {
    console.log("[migrate-deploy] Schema ready.");
  }
}

function isBenignAlreadyExists(out) {
  return (
    /already exists/i.test(out) ||
    /P3018/i.test(out) ||
    /relation .* already exists/i.test(out) ||
    /type .* already exists/i.test(out)
  );
}

forceMelConnectionEnv();

if (!process.env.DATABASE_URL || !process.env.DIRECT_URL) {
  console.error("[migrate-deploy] DATABASE_URL / DIRECT_URL em falta.");
  process.exit(1);
}

ensureMelSchema();

let result = run(["migrate", "deploy"]);
process.stdout.write(result.out);

// Failed Mel migration recorded in mel._prisma_migrations → roll back marker & retry
if (result.code !== 0 && /P3009/i.test(result.out) && result.out.includes(MEL_MIGRATION)) {
  console.log(
    `[migrate-deploy] Resolving failed Mel migration ${MEL_MIGRATION} as rolled-back, retrying…`,
  );
  const rolled = run(["migrate", "resolve", "--rolled-back", MEL_MIGRATION]);
  process.stdout.write(rolled.out);
  result = run(["migrate", "deploy"]);
  process.stdout.write(result.out);
}

// Residue from a prior partial apply in schema mel
if (result.code !== 0 && isBenignAlreadyExists(result.out)) {
  console.log(
    `[migrate-deploy] Objects already present in schema mel — marking ${MEL_MIGRATION} applied.`,
  );
  const applied = run(["migrate", "resolve", "--applied", MEL_MIGRATION]);
  process.stdout.write(applied.out);
  result = run(["migrate", "deploy"]);
  process.stdout.write(result.out);
  if (result.code !== 0 && isBenignAlreadyExists(result.out)) {
    console.warn("[migrate-deploy] Continuing build despite already-exists residue.");
    process.exit(0);
  }
}

if (result.code !== 0 && /P3009/i.test(result.out) && !result.out.includes(MEL_MIGRATION)) {
  console.error(
    "[migrate-deploy] P3009 cites a non-Mel migration — connection may still hit public. Aborting.",
  );
}

if (result.code !== 0) {
  process.exit(result.code);
}
