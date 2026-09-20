/**
 * Regressão: Fatura NÃO abre a câmara automaticamente.
 * QuickAddFab → /pt/captura?mode=photo (sem auto=1)
 * InstantCapture → sem cameraRef.click() em autoStart photo
 * captura/page → autoStart só para voice
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

describe("fatura never auto-opens camera", () => {
  it("QuickAddFab Fatura link has no auto=1", () => {
    const src = readFileSync(
      path.join(process.cwd(), "src/components/layout/QuickAddFab.tsx"),
      "utf8",
    );
    assert.match(src, /\/pt\/captura\?mode=photo"/);
    assert.doesNotMatch(src, /mode=photo&auto=1/);
  });

  it("InstantCapture autoStart never clicks camera for photo", () => {
    const code = stripComments(
      readFileSync(path.join(process.cwd(), "src/components/nina/InstantCapture.tsx"), "utf8"),
    );
    // Voz continua a poder auto-iniciar
    assert.match(code, /initialMode === "voice"/);
    assert.match(code, /startListening\(true\)/);
    // O ramo photo + cameraRef.click no efeito autoStart deve ter desaparecido
    assert.doesNotMatch(
      code,
      /initialMode === "photo"[\s\S]{0,200}cameraRef\.current\?\.click\(\)/,
    );
  });

  it("captura page ignores auto for photo mode", () => {
    const code = stripComments(
      readFileSync(
        path.join(process.cwd(), "src/app/[locale]/(app)/captura/page.tsx"),
        "utf8",
      ),
    );
    assert.match(code, /mode === "voice"/);
    assert.match(code, /autoStart/);
  });

  it("PWA manifest photo shortcut has no auto=1", () => {
    const src = readFileSync(path.join(process.cwd(), "src/app/manifest.ts"), "utf8");
    assert.doesNotMatch(src, /mode=photo&auto=1/);
    assert.match(src, /mode=photo&utm_source=pwa_shortcut/);
  });
});
