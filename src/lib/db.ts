import { PrismaClient } from "@prisma/client";
import { PrismaNeonHttp } from "@prisma/adapter-neon";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

/**
 * Neon on Vercel serverless: use the HTTP driver adapter.
 * WebSocket (`PrismaNeon`) is fragile across cold starts and was producing
 * empty HTTP 500s on model queries (e.g. VehicleClass.findMany) while
 * `$queryRaw SELECT 1` still succeeded.
 */
function createPrismaClient(): PrismaClient {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    throw new Error("DATABASE_URL is not set");
  }

  const connectionString = sanitizeDatabaseUrl(raw);
  const adapter = new PrismaNeonHttp(connectionString, {
    arrayMode: false,
    fullResults: true,
  });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

/** Strip params that break serverless drivers / PgBouncer. */
export function sanitizeDatabaseUrl(url: string): string {
  try {
    const u = new URL(url);
    u.searchParams.delete("channel_binding");
    if (!u.searchParams.has("sslmode")) u.searchParams.set("sslmode", "require");
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
  globalForPrisma.prisma = prisma;
}
