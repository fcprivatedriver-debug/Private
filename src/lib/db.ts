import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

/**
 * Neon on Vercel serverless: use the WebSocket driver adapter.
 * Plain Prisma TCP + `channel_binding=require` commonly hangs forever
 * inside Auth.js `authorize`, which leaves the login button on "A entrar...".
 *
 * Local PostgreSQL (127.0.0.1 / localhost / docker hostnames) uses the
 * standard TCP Prisma client — Neon WebSocket adapter cannot talk to it.
 */
function isNeonHost(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.includes("neon.tech") || host.includes("neon.");
  } catch {
    return /neon\.tech|neon\./i.test(url);
  }
}

function createPrismaClient(): PrismaClient {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    throw new Error("DATABASE_URL is not set");
  }

  const connectionString = sanitizeDatabaseUrl(raw);

  if (isNeonHost(connectionString)) {
    const adapter = new PrismaNeon({ connectionString });
    return new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
  }

  return new PrismaClient({
    datasources: { db: { url: connectionString } },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

/** Strip params that break serverless drivers / PgBouncer. */
export function sanitizeDatabaseUrl(url: string): string {
  try {
    const u = new URL(url);
    u.searchParams.delete("channel_binding");
    // Local Postgres does not need sslmode=require
    if (isNeonHost(url) && !u.searchParams.has("sslmode")) {
      u.searchParams.set("sslmode", "require");
    }
    return u.toString();
  } catch {
    return url
      .replace(/&?channel_binding=require/g, "")
      .replace(/\?&/, "?")
      .replace(/\?$/, "");
  }
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
} else {
  // Reuse across warm Vercel isolates
  globalForPrisma.prisma = prisma;
}
