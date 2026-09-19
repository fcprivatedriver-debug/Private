/**
 * Regressão — fluxo “Já tenho conta” / login vs verificação de email.
 * Garante: sem check pré-password, sem auto-resend, resend só no clique,
 * sem navegação para previewUrl/localhost.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import path from "node:path";

const root = process.cwd();

function read(rel: string) {
  return readFileSync(path.join(root, rel), "utf8");
}

describe("login vs verificação de email", () => {
  const login = read("src/components/auth/LoginForm.tsx");
  const landing = read("src/app/[locale]/page.tsx");
  const account = read("src/actions/auth-account.ts");
  const pending = read("src/components/auth/VerifyEmailPending.tsx");

  it("Já tenho conta só navega para /pt/login (HardNavLink)", () => {
    assert.match(landing, /Já tenho conta/);
    assert.match(landing, /href="\/pt\/login"/);
    assert.doesNotMatch(landing, /resendVerificationEmail/);
    assert.doesNotMatch(landing, /authenticateCredentials/);
  });

  it("LoginForm valida credenciais antes de tratar não-verificado", () => {
    assert.match(login, /authenticateCredentials/);
    assert.doesNotMatch(login, /checkEmailVerified/);
    const authIdx = login.indexOf("authenticateCredentials");
    const unverifiedIdx = login.indexOf("EMAIL_NOT_VERIFIED");
    assert.ok(authIdx > 0 && unverifiedIdx > authIdx);
  });

  it("LoginForm não afirma que o email foi enviado automaticamente", () => {
    assert.doesNotMatch(login, /Enviámos-te um link/);
    assert.match(login, /podes reenviar abaixo/);
  });

  it("Reenviar email fica na página de login (botão, sem redirect)", () => {
    assert.match(login, /resendVerificationEmail/);
    assert.match(login, /Reenviar email/);
    assert.doesNotMatch(login, /verificar-email\?email=/);
    assert.doesNotMatch(login, /window\.location\.href\s*=\s*.*previewUrl/);
    assert.doesNotMatch(login, /location\.assign\(.*previewUrl/);
  });

  it("VerifyEmailPending nunca navega para previewUrl", () => {
    assert.doesNotMatch(pending, /window\.location/);
    assert.doesNotMatch(pending, /router\.push\(.*preview/);
    assert.match(pending, /Nunca navegar para previewUrl/);
  });

  it("resendVerificationEmail só envia mail se user existir e não verificado", () => {
    assert.match(account, /export async function resendVerificationEmail/);
    assert.match(account, /if \(user\.emailVerified\)/);
    assert.match(account, /sendAppEmail/);
  });

  it("authenticateCredentials não envia email", () => {
    const fnStart = account.indexOf("export async function authenticateCredentials");
    assert.ok(fnStart > 0);
    const nextExport = account.indexOf("export async function", fnStart + 10);
    const body = account.slice(fnStart, nextExport > 0 ? nextExport : undefined);
    assert.doesNotMatch(body, /sendAppEmail/);
    assert.doesNotMatch(body, /resendVerification/);
    assert.match(body, /resolveLoginCredentials/);
  });

  it("registo com email existente não cria conta e aponta para login", () => {
    assert.match(account, /EMAIL_EXISTS/);
    assert.match(account, /Email já registado\. Entra com a tua conta\./);
  });
});
