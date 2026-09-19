/**
 * Regressão — olho da password + autocomplete login.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import path from "node:path";

const root = process.cwd();
function read(rel: string) {
  return readFileSync(path.join(root, rel), "utf8");
}

describe("password field + password manager hooks", () => {
  const css = read("src/app/globals.css");
  const field = read("src/components/ui/PasswordField.tsx");
  const login = read("src/components/auth/LoginForm.tsx");

  it("define --muted e cor do olho em azul petróleo", () => {
    assert.match(css, /--muted:\s*#527273/);
    assert.match(css, /\.password-toggle[\s\S]*?color:\s*#245563/);
  });

  it("reserva padding-right para o olho (não anulado por .field input)", () => {
    assert.match(css, /\.field \.password-field input[\s\S]*?padding-right:\s*3\.5rem/);
  });

  it("toggle é type=button com aria-label de mostrar/ocultar", () => {
    assert.match(field, /type="button"/);
    assert.match(field, /Mostrar palavra-passe/);
    assert.match(field, /Ocultar palavra-passe/);
  });

  it("login usa autocomplete username + current-password", () => {
    assert.match(login, /autoComplete="username"/);
    assert.match(login, /autoComplete="current-password"/);
  });

  it("login não desmonta o formulário só por loading (gestor de passwords)", () => {
    assert.match(login, /status === "authenticated" \|\| leaving/);
    assert.doesNotMatch(login, /status === "authenticated" \|\| leaving \|\| loading/);
  });
});
