#!/usr/bin/env node
/**
 * Local/Vercel build entry: load .env, force Mel schema, migrate, next build.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const MEL_SCHEMA = "mel";

function loadDotEnv() {
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
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

loadDotEnv();

if (!process.env.DIRECT_URL) {
  process.env.DIRECT_URL =
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.DATABASE_URL ||
    "";
}

if (!process.env.AUTH_SECRET && !process.env.NEXTAUTH_SECRET) {
  process.env.AUTH_SECRET =
    "mel-demo-auth-secret-do-not-use-in-real-prod-32b";
  console.log("[build] AUTH_SECRET fallback de demo (define AUTH_SECRET no Vercel).");
}

if (process.env.DATABASE_URL) {
  process.env.DATABASE_URL = withMelSchema(
    stripChannelBinding(process.env.DATABASE_URL),
  );
}
if (process.env.DIRECT_URL) {
  process.env.DIRECT_URL = withMelSchema(
    stripChannelBinding(process.env.DIRECT_URL),
  );
}
process.env.MEL_PG_SCHEMA = MEL_SCHEMA;

if (!process.env.DATABASE_URL || !process.env.DIRECT_URL) {
  console.error("[build] DATABASE_URL / DIRECT_URL em falta.");
  process.exit(1);
}

function run(cmd, args) {
  const res = spawnSync(cmd, args, {
    stdio: "inherit",
    env: process.env,
    shell: false,
  });
  if ((res.status ?? 1) !== 0) process.exit(res.status ?? 1);
}

run("npx", ["prisma", "generate"]);
run("node", ["scripts/migrate-deploy.mjs"]);
run("npx", ["next", "build"]);
