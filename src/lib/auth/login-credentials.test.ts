/**
 * Unit tests — resolveLoginCredentials
 * Run: npx tsx --test src/lib/auth/login-credentials.test.ts
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveLoginCredentials } from "./login-credentials";

describe("resolveLoginCredentials", () => {
  it("conta verificada + password correcta → ok", () => {
    const res = resolveLoginCredentials({
      email: "a@b.com",
      userExists: true,
      hasPassword: true,
      passwordValid: true,
      emailVerified: true,
    });
    assert.deepEqual(res, { ok: true });
  });

  it("password incorrecta → INVALID_CREDENTIALS (mesmo se não verificado)", () => {
    const res = resolveLoginCredentials({
      email: "a@b.com",
      userExists: true,
      hasPassword: true,
      passwordValid: false,
      emailVerified: false,
    });
    assert.deepEqual(res, { ok: false, reason: "INVALID_CREDENTIALS" });
  });

  it("password correcta + email não verificado → EMAIL_NOT_VERIFIED", () => {
    const res = resolveLoginCredentials({
      email: "a@b.com",
      userExists: true,
      hasPassword: true,
      passwordValid: true,
      emailVerified: false,
    });
    assert.deepEqual(res, {
      ok: false,
      reason: "EMAIL_NOT_VERIFIED",
      email: "a@b.com",
    });
  });

  it("utilizador inexistente → INVALID_CREDENTIALS", () => {
    const res = resolveLoginCredentials({
      email: "x@y.com",
      userExists: false,
      hasPassword: false,
      passwordValid: false,
      emailVerified: false,
    });
    assert.deepEqual(res, { ok: false, reason: "INVALID_CREDENTIALS" });
  });
});
