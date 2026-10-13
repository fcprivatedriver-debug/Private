#!/usr/bin/env node
/**
 * Deploy Prisma migrations with recovery for foreign/failed migrations (P3009)
 * and Nina schema isolation on shared Neon.
 */
import { spawnSync } from "node:child_process";
import { appendFileSync, readFileSync } from "node:fs";
import { applyEnsureEnv } from "./ensure-env.mjs";
import { prismaDbExecuteArgs, redactDbHost } from "./pg-url.mjs";

applyEnsureEnv({ exitOnError: true });

console.log("[migrate-deploy] DATABASE_URL host:", redactDbHost(process.env.DATABASE_URL));
console.log("[migrate-deploy] DIRECT_URL host:", redactDbHost(process.env.DIRECT_URL));

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
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
  // Prisma 6.6+ exits with "Either --url or --schema must be provided"
  // when `db execute` is called with only --stdin. --url and --schema
  // cannot be combined. The URL stays in argv of this child, not in the log.
  const res = spawnSync("npx", ["prisma", ...prismaDbExecuteArgs(url)], {
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

if (result.code !== 0 && result.out.includes("P1001") && process.env.VERCEL) {
  if (preferIpv4Dns()) {
    console.log("[migrate-deploy] Retry migrate deploy com DNS IPv4 após P1001…");
    result = run(["migrate", "deploy"]);
    process.stdout.write(result.out);
  }
}

if (result.code !== 0) {
  if (result.out.includes("P1001")) explainP1001(result.out);
  process.exit(result.code);
}

/** Prisma's schema engine can pick an unreachable AAAA on Vercel. glibc honors no-aaaa. */
function preferIpv4Dns() {
  try {
    const path = "/etc/resolv.conf";
    const current = readFileSync(path, "utf8");
    if (!current.includes("no-aaaa")) {
      appendFileSync(path, "\noptions no-aaaa\n");
    }
    console.log("[migrate-deploy] DNS: options no-aaaa");
    return true;
  } catch (error) {
    console.warn(
      "[migrate-deploy] não foi possível ajustar resolv.conf:",
      error instanceof Error ? error.message : error,
    );
    return false;
  }
}

function explainP1001(out) {
  const mentioned = out.match(/at `([^`]+)`(?::`(\d+)`)?/);
  console.error("[migrate-deploy] P1001: o build da Vercel não abre ligação TCP ao Neon.");
  console.error("[migrate-deploy] Variável DATABASE_URL host:", redactDbHost(process.env.DATABASE_URL));
  console.error("[migrate-deploy] Variável DIRECT_URL host:", redactDbHost(process.env.DIRECT_URL));
  if (mentioned) {
    console.error(
      "[migrate-deploy] Host recusado pelo Prisma:",
      mentioned[2] ? `${mentioned[1]}:${mentioned[2]}` : mentioned[1],
    );
  }
  console.error(
    "[migrate-deploy] DIRECT_URL é a ligação das migrações. Se estiver vazia no projeto, o build copia DATABASE_URL_UNPOOLED, depois POSTGRES_URL_NON_POOLING, depois DATABASE_URL.",
  );
  console.error(
    "[migrate-deploy] No projeto Vercel deste build → Settings → Environment Variables → Preview (não Production): confirme DATABASE_URL (hostname com -pooler) e DIRECT_URL (hostname sem -pooler) de um endpoint Neon activo. Se o compute estiver suspenso, abra-o na consola Neon e faça Redeploy deste Preview. Não apague a base nem rode migrate reset.",
  );
}
