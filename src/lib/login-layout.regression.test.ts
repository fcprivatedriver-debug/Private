import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import path from "node:path";

/**
 * Regressão do bug Entrar→flash: layout locale SEM {children}
 * faz /pt/login SSR da landing (LoginForm no flight, nunca no DOM).
 */
describe("locale layout mounts children (login)", () => {
  const layoutPath = path.join(process.cwd(), "src/app/[locale]/layout.tsx");
  const source = readFileSync(layoutPath, "utf8");

  it("renderiza {children} — sem isto /pt/login mostra a landing", () => {
    assert.match(source, /\{children\}/);
    assert.match(source, /ThemeProvider/);
    assert.match(source, /AuthProvider/);
    assert.match(source, /NextIntlClientProvider/);
  });

  it("não embute a landing no layout", () => {
    assert.doesNotMatch(source, /landing-v2/);
    assert.doesNotMatch(source, /landing-hero/);
    assert.doesNotMatch(source, /Sabe onde vai/);
    assert.doesNotMatch(source, /BrandLogo/);
  });
});
