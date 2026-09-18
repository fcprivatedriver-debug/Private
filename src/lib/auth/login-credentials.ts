/**
 * Pure decision helper for credentials login.
 * Distinguishes invalid password from unverified email — never implies mail was sent.
 */
export type LoginCredentialsResult =
  | { ok: true }
  | { ok: false; reason: "INVALID_CREDENTIALS" }
  | { ok: false; reason: "EMAIL_NOT_VERIFIED"; email: string };

export function resolveLoginCredentials(opts: {
  email: string;
  userExists: boolean;
  hasPassword: boolean;
  passwordValid: boolean;
  emailVerified: boolean;
}): LoginCredentialsResult {
  if (!opts.userExists || !opts.hasPassword || !opts.passwordValid) {
    return { ok: false, reason: "INVALID_CREDENTIALS" };
  }
  if (!opts.emailVerified) {
    return {
      ok: false,
      reason: "EMAIL_NOT_VERIFIED",
      email: opts.email,
    };
  }
  return { ok: true };
}
