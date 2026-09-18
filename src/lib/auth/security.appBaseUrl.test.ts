/**
 * Unit tests — appBaseUrl / allowDevMailPreview
 * Run: npx tsx --test src/lib/auth/security.appBaseUrl.test.ts
 */
import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  allowDevMailPreview,
  appBaseUrl,
  PRODUCTION_APP_ORIGIN,
} from "./security";

const KEYS = [
  "AUTH_URL",
  "NEXT_PUBLIC_APP_URL",
  "VERCEL",
  "VERCEL_ENV",
  "VERCEL_URL",
  "NODE_ENV",
] as const;

type EnvKey = (typeof KEYS)[number];

const saved: Partial<Record<EnvKey, string | undefined>> = {};
const env = process.env as Record<string, string | undefined>;

function snap() {
  for (const k of KEYS) saved[k] = env[k];
}

function restore() {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete env[k];
    else env[k] = saved[k];
  }
}

function clear() {
  for (const k of KEYS) delete env[k];
}

function setEnv( partial: Partial<Record<EnvKey, string>>) {
  for (const [k, v] of Object.entries(partial)) {
    env[k] = v;
  }
}

describe("appBaseUrl", () => {
  beforeEach(() => {
    snap();
    clear();
  });
  afterEach(restore);

  it("usa AUTH_URL quando definido e válido", () => {
    setEnv({ AUTH_URL: "https://addandknow.pt/", NODE_ENV: "production" });
    assert.equal(appBaseUrl(), "https://addandknow.pt");
  });

  it("Production sem AUTH_URL → addandknow.pt (nunca 127.0.0.1)", () => {
    setEnv({ VERCEL: "1", VERCEL_ENV: "production", NODE_ENV: "production" });
    assert.equal(appBaseUrl(), PRODUCTION_APP_ORIGIN);
  });

  it("ignora AUTH_URL loopback em Production", () => {
    setEnv({
      VERCEL: "1",
      VERCEL_ENV: "production",
      NODE_ENV: "production",
      AUTH_URL: "http://127.0.0.1:3000",
    });
    assert.equal(appBaseUrl(), PRODUCTION_APP_ORIGIN);
  });

  it("Preview prefere VERCEL_BRANCH_URL ao deployment host", () => {
    setEnv({
      VERCEL: "1",
      VERCEL_ENV: "preview",
      VERCEL_URL: "private-duur-mlv2sf9es-fc-private-driver.vercel.app",
      VERCEL_BRANCH_URL:
        "private-duur-git-cursor-canonical-stable-ec69-fc-private-driver.vercel.app",
      NODE_ENV: "production",
    });
    assert.equal(
      appBaseUrl(),
      "https://private-duur-git-cursor-canonical-stable-ec69-fc-private-driver.vercel.app",
    );
  });

  it("Preview usa VERCEL_URL", () => {
    setEnv({
      VERCEL: "1",
      VERCEL_ENV: "preview",
      VERCEL_URL:
        "private-duur-git-cursor-canonical-stable-ec69-fc-private-driver.vercel.app",
      NODE_ENV: "production",
    });
    assert.equal(
      appBaseUrl(),
      "https://private-duur-git-cursor-canonical-stable-ec69-fc-private-driver.vercel.app",
    );
  });

  it("Development local permite 127.0.0.1", () => {
    setEnv({ NODE_ENV: "development" });
    assert.equal(appBaseUrl(), "http://127.0.0.1:3000");
  });

  it("allowDevMailPreview só em local", () => {
    setEnv({ NODE_ENV: "development" });
    assert.equal(allowDevMailPreview(), true);

    setEnv({ VERCEL: "1", VERCEL_ENV: "preview" });
    assert.equal(allowDevMailPreview(), false);

    delete env.VERCEL;
    delete env.VERCEL_ENV;
    setEnv({ NODE_ENV: "production" });
    assert.equal(allowDevMailPreview(), false);
  });
});
