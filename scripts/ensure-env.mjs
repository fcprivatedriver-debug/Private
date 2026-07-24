#!/usr/bin/env node
/**
 * Ensure Prisma DIRECT_URL / AUTH_SECRET / Nina schema exist before migrate + build.
 * Importable by migrate-deploy / build wrappers so env mutations stick in-process.
 *
 * On Vercel, Nina uses PostgreSQL schema `nina` so it can coexist with Zrik (`public`)
 * on the same Neon database without migrate clashes.
 */
import { pathToFileURL } from "node:url";

function stripChannelBinding(url) {
  try {
    const u = new URL(url);
    u.searchParams.delete("channel_binding");
    return u.toString();
  } catch {
    return String(url).replace(/&?channel_binding=require/g, "");
  }
}

function withPgSchema(url, schema) {
  try {
    const u = new URL(url);
    u.searchParams.set("schema", schema);
    return u.toString();
  } catch {
    const sep = String(url).includes("?") ? "&" : "?";
    return `${url}${sep}schema=${encodeURIComponent(schema)}`;
  }
}

export function applyEnsureEnv({ exitOnError = true } = {}) {
  if (!process.env.DIRECT_URL) {
    process.env.DIRECT_URL =
      process.env.DATABASE_URL_UNPOOLED ||
      process.env.POSTGRES_URL_NON_POOLING ||
      process.env.DATABASE_URL ||
      "";
    if (process.env.DIRECT_URL) {
      console.log(
        "[ensure-env] DIRECT_URL derived from",
        process.env.DATABASE_URL_UNPOOLED
          ? "DATABASE_URL_UNPOOLED"
          : process.env.POSTGRES_URL_NON_POOLING
            ? "POSTGRES_URL_NON_POOLING"
            : "DATABASE_URL",
      );
    }
  }

  if (!process.env.AUTH_SECRET && !process.env.NEXTAUTH_SECRET) {
    process.env.AUTH_SECRET =
      "nina-demo-auth-secret-do-not-use-in-real-prod-32b";
    console.log("[ensure-env] AUTH_SECRET set to demo fallback for this build");
  }

  if (process.env.DATABASE_URL) {
    process.env.DATABASE_URL = stripChannelBinding(process.env.DATABASE_URL);
  }
  if (process.env.DIRECT_URL) {
    process.env.DIRECT_URL = stripChannelBinding(process.env.DIRECT_URL);
  }
  if (process.env.DATABASE_URL_UNPOOLED) {
    process.env.DATABASE_URL_UNPOOLED = stripChannelBinding(
      process.env.DATABASE_URL_UNPOOLED,
    );
  }

  if (!process.env.DATABASE_URL) {
    console.error(
      "[ensure-env] DATABASE_URL is missing. Connect Neon in Vercel Storage, or set DATABASE_URL.",
    );
    if (exitOnError) process.exit(1);
    return false;
  }

  if (!process.env.DIRECT_URL) {
    console.error("[ensure-env] Could not resolve DIRECT_URL");
    if (exitOnError) process.exit(1);
    return false;
  }
  process.env.DIRECT_URL = stripChannelBinding(process.env.DIRECT_URL);

  const useNinaSchema =
    process.env.NINA_PG_SCHEMA === "nina" ||
    process.env.FORCE_NINA_SCHEMA === "true" ||
    Boolean(process.env.VERCEL);

  if (useNinaSchema) {
    const schema = process.env.NINA_PG_SCHEMA || "nina";
    process.env.NINA_PG_SCHEMA = schema;
    process.env.DATABASE_URL = withPgSchema(process.env.DATABASE_URL, schema);
    process.env.DIRECT_URL = withPgSchema(process.env.DIRECT_URL, schema);
    if (process.env.DATABASE_URL_UNPOOLED) {
      process.env.DATABASE_URL_UNPOOLED = withPgSchema(
        process.env.DATABASE_URL_UNPOOLED,
        schema,
      );
    }
    console.log(`[ensure-env] Using PostgreSQL schema "${schema}" for Nina`);
  }

  if (process.env.VERCEL_URL && !process.env.AUTH_URL && !process.env.NEXTAUTH_URL) {
    process.env.AUTH_URL = `https://${process.env.VERCEL_URL}`;
    console.log("[ensure-env] AUTH_URL set from VERCEL_URL");
  }

  return true;
}

const isDirectRun =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  applyEnsureEnv({ exitOnError: true });
}
