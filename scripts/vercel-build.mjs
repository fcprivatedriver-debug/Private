#!/usr/bin/env node
/**
 * Vercel/production build: apply env fixes then generate → migrate → next build
 * in the same process tree so schema=nina and DIRECT_URL stick.
 */
import { spawnSync } from "node:child_process";
import { applyEnsureEnv } from "./ensure-env.mjs";

applyEnsureEnv({ exitOnError: true });

function run(cmd, args) {
  console.log(`[build] $ ${cmd} ${args.join(" ")}`);
  const res = spawnSync(cmd, args, {
    encoding: "utf8",
    env: process.env,
    stdio: "inherit",
    shell: false,
  });
  if ((res.status ?? 1) !== 0) process.exit(res.status ?? 1);
}

run("npx", ["prisma", "generate"]);
run("node", ["scripts/migrate-deploy.mjs"]);
run("npx", ["next", "build"]);
