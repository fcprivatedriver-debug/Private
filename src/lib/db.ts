import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function resolveNinaSchema(): string | null {
  return (
    process.env.NINA_PG_SCHEMA ||
    (process.env.VERCEL ? "nina" : null) ||
    (process.env.FORCE_NINA_SCHEMA === "true" ? "nina" : null)
  );
}

function sanitizeDatabaseUrl(url: string): string {
  try {
    const u = new URL(url);
    u.searchParams.delete("channel_binding");
    if (u.hostname.includes("neon.tech") && !u.searchParams.has("sslmode")) {
      u.searchParams.set("sslmode", "require");
    }
    // On Vercel (shared Neon with Zrik), keep Nina in its own Postgres schema.
    const forceSchema = resolveNinaSchema();
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

function createNeonClient(connectionString: string): PrismaClient {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaNeon } = require("@prisma/adapter-neon") as typeof import("@prisma/adapter-neon");
  const schema = resolveNinaSchema();
  // CRITICAL: PrismaNeon ignores ?schema= in the URL unless passed explicitly.
  // Without this, runtime hits Zrik's `public` schema → server exceptions → blank page.
  const adapter = schema
    ? new PrismaNeon({ connectionString }, { schema })
    : new PrismaNeon({ connectionString });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

async function createPrismaClient(): Promise<PrismaClient> {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    throw new Error("DATABASE_URL is not set");
  }

  const connectionString = sanitizeDatabaseUrl(raw);

  if (isNeonUrl(connectionString)) {
    const { PrismaNeon } = await import("@prisma/adapter-neon");
    const schema = resolveNinaSchema();
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

function createPrismaClientSync(): PrismaClient {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    throw new Error("DATABASE_URL is not set");
  }
  const connectionString = sanitizeDatabaseUrl(raw);

  if (isNeonUrl(connectionString)) {
    return createNeonClient(connectionString);
  }

  return new PrismaClient({
    datasources: { db: { url: connectionString } },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

void createPrismaClient;

export const prisma = globalForPrisma.prisma ?? createPrismaClientSync();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
} else {
  globalForPrisma.prisma = prisma;
}

export { sanitizeDatabaseUrl, resolveNinaSchema };
