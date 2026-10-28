import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  canShowInstallPrompt,
  isSensitiveInstallPath,
  noteInstallVisit,
  PWA_INSTALL_COOLDOWN_MS,
  PWA_INSTALL_MIN_VISITS,
  readPwaInstallState,
  writePwaInstallState,
} from "./install-prompt";

describe("pwa install prompt persistence", () => {
  it("never shows in standalone", () => {
    assert.equal(
      canShowInstallPrompt({}, { standalone: true }),
      false,
    );
  });

  it("never shows after installedAt", () => {
    assert.equal(
      canShowInstallPrompt({ installedAt: 1 }, { standalone: false }),
      false,
    );
  });

  it("respects dismiss cooldown", () => {
    const now = 1_000_000;
    assert.equal(
      canShowInstallPrompt(
        { dismissedAt: now - 1000 },
        { standalone: false, now },
      ),
      false,
    );
    assert.equal(
      canShowInstallPrompt(
        { dismissedAt: now - PWA_INSTALL_COOLDOWN_MS - 1, visitCount: PWA_INSTALL_MIN_VISITS },
        { standalone: false, now, pathname: "/pt/dashboard" },
      ),
      true,
    );
  });

  it("não aparece no registo, login ou convite, nem antes de uso real", () => {
    assert.equal(isSensitiveInstallPath("/pt/registo"), true);
    assert.equal(isSensitiveInstallPath("/pt/login"), true);
    assert.equal(isSensitiveInstallPath("/pt/convite/abc"), true);
    assert.equal(
      canShowInstallPrompt(
        { visitCount: 5 },
        { standalone: false, pathname: "/pt/registo" },
      ),
      false,
    );
    assert.equal(
      canShowInstallPrompt(
        { visitCount: 1 },
        { standalone: false, pathname: "/pt/dashboard" },
      ),
      false,
    );
  });

  it("conta cada caminho uma vez e ignora o registo", () => {
    const once = noteInstallVisit({}, "/pt/dashboard");
    assert.equal(once.visitCount, 1);
    const again = noteInstallVisit(once, "/pt/dashboard");
    assert.equal(again.visitCount, 1);
    const registo = noteInstallVisit(again, "/pt/registo");
    assert.equal(registo.visitCount, 1);
    const second = noteInstallVisit(registo, "/pt/despesas");
    assert.equal(second.visitCount, 2);
  });

  it("reads/writes storage JSON and legacy flag", () => {
    const mem = new Map<string, string>();
    const storage = {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => {
        mem.set(k, v);
      },
    };
    writePwaInstallState(storage, { dismissedAt: 42 });
    assert.equal(readPwaInstallState(storage).dismissedAt, 42);
    mem.clear();
    mem.set("addyknow-ios-install-dismissed", "1");
    assert.ok(readPwaInstallState(storage).dismissedAt);
  });
});
