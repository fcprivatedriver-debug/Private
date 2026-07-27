import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

/** Em Neon partilhado, a Mel vive no schema `mel` para não colidir com outros produtos. */
export function resolveMelSchema(): string | null {
  return (
    process.env.MEL_PG_SCHEMA ||
    (process.env.VERCEL ? "mel" : null) ||
    (process.env.FORCE_MEL_SCHEMA === "true" ? "mel" : null)
  );
}

export function sanitizeDatabaseUrl(url: string): string {
  try {
    const u = new URL(url);
    u.searchParams.delete("channel_binding");
    if (u.hostname.includes("neon.tech") && !u.searchParams.has("sslmode")) {
      u.searchParams.set("sslmode", "require");
    }
    const forceSchema = resolveMelSchema();
    if (forceSchema) {
      u.searchParams.set("schema", forceSchema);
    }
    return u.toString();
  } catch {
    return url
      .replace(/&?channel_binding=require/g, "")
      .replace(/\?&/, "?")
      .replace(/\?$/, "");
  }
}

function isNeonUrl(url: string): boolean {
  return /neon\.tech/i.test(url);
}

function createPrismaClient(): PrismaClient {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    throw new Error("DATABASE_URL is not set");
  }

  const connectionString = sanitizeDatabaseUrl(raw);

  if (isNeonUrl(connectionString)) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaNeon } = require("@prisma/adapter-neon") as typeof import("@prisma/adapter-neon");
    const schema = resolveMelSchema();
    const adapter = schema
      ? new PrismaNeon({ connectionString }, { schema })
      : new PrismaNeon({ connectionString });
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

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
} else {
  globalForPrisma.prisma = prisma;
}
