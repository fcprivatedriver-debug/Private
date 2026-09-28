import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  canShowInstallPrompt,
  PWA_INSTALL_COOLDOWN_MS,
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
        { dismissedAt: now - PWA_INSTALL_COOLDOWN_MS - 1 },
        { standalone: false, now },
      ),
      true,
    );
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
