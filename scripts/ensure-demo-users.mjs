#!/usr/bin/env node
/**
 * On empty Nina schema (e.g. first Vercel deploy), load demo users so
 * familia@nina.app / nina123 works. Never wipes an already-populated DB.
 */
import { spawnSync } from "node:child_process";
import { applyEnsureEnv } from "./ensure-env.mjs";

applyEnsureEnv({ exitOnError: true });

async function main() {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  try {
    const count = await prisma.user.count();
    console.log(`[ensure-demo] users in schema: ${count}`);
    if (count > 0) {
      console.log("[ensure-demo] skip seed (database already has users)");
      return;
    }
  } finally {
    await prisma.$disconnect();
  }

  console.log("[ensure-demo] empty database — running demo seed");
  const res = spawnSync(
    "npx",
    ["tsx", "prisma/seed.ts"],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        DEMO_MODE: "true",
        ALLOW_DEMO_SEED: "true",
      },
      stdio: "inherit",
      shell: false,
    },
  );
  if ((res.status ?? 1) !== 0) process.exit(res.status ?? 1);
}

main().catch((err) => {
  console.error("[ensure-demo] failed", err);
  process.exit(1);
});
