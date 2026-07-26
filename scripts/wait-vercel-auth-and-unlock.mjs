#!/usr/bin/env node
/**
 * Poll until `vercel whoami` succeeds, then disable SSO on private-duur
 * and print the public preview URL for verification.
 */
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const PROJECT = "prj_MIG6ve415nGmPL28QmqS1uwdyZ8q";
const TEAM_SLUG = "fc-private-driver";
const STABLE_URL =
  "https://private-duur-git-nina-fc-private-driver.vercel.app";

function run(cmd, args, opts = {}) {
  return spawnSync(cmd, args, {
    encoding: "utf8",
    ...opts,
  });
}

function whoami() {
  const res = run("npx", ["vercel", "whoami"], {
    timeout: 20000,
    env: process.env,
  });
  const out = `${res.stdout || ""}${res.stderr || ""}`;
  if (/No existing credentials|Waiting for authentication|Visit https/i.test(out)) {
    return null;
  }
  if ((res.status ?? 1) !== 0) return null;
  const name = out.trim().split("\n").filter(Boolean).pop();
  return name || null;
}

async function getTokenFromCliAuth() {
  // Vercel CLI stores token after login; prefer env if present
  return (
    process.env.VERCEL_TOKEN ||
    process.env.NINA_VERCEL_TOKEN ||
    process.env.VERCEL_API_TOKEN ||
    ""
  );
}

async function disableSso(token) {
  if (!token) return { ok: false, reason: "no_token" };
  const url = `https://api.vercel.com/v9/projects/${PROJECT}?teamId=${TEAM_SLUG}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ssoProtection: null, passwordProtection: null }),
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, text: text.slice(0, 400) };
}

async function probePublic(url) {
  const res = await fetch(url, { redirect: "manual" });
  const loc = res.headers.get("location") || "";
  const sso = /sso-api|vercel\.com\/login/i.test(loc);
  return { status: res.status, location: loc.slice(0, 120), sso };
}

const user = whoami();
if (!user) {
  console.log("[unlock] Still waiting for `vercel login`.");
  process.exit(2);
}

console.log("[unlock] Authenticated as", user);
const token = await getTokenFromCliAuth();
// Try reading auth.json token
let cliToken = token;
try {
  const { readFileSync } = await import("node:fs");
  const auth = JSON.parse(
    readFileSync(
      `${process.env.HOME}/.local/share/com.vercel.cli/auth.json`,
      "utf8",
    ),
  );
  cliToken = cliToken || auth.token || auth.accessToken || "";
} catch {
  /* ignore */
}

const result = await disableSso(cliToken);
console.log("[unlock] disable SSO", result);

const probe = await probePublic(STABLE_URL);
console.log("[unlock] probe", probe);

writeFileSync(
  "/tmp/nina-unlock-status.json",
  JSON.stringify({ user, result, probe, url: STABLE_URL }, null, 2),
);

if (probe.sso || probe.status === 401 || probe.status === 403) {
  process.exit(3);
}
console.log("[unlock] PUBLIC_OK", STABLE_URL);
process.exit(0);
