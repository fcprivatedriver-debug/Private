/**
 * Regressão: landing pública sem valores financeiros fictícios.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import path from "node:path";

describe("landing sem DEMO_CARDS", () => {
  const page = readFileSync(
    path.join(process.cwd(), "src/app/[locale]/page.tsx"),
    "utf8",
  );

  it("não contém saldos/despesas demo", () => {
    assert.doesNotMatch(page, /DEMO_CARDS/);
    assert.doesNotMatch(page, /landing-glance/);
    assert.doesNotMatch(page, /1\.240/);
    assert.doesNotMatch(page, /386,40/);
    assert.doesNotMatch(page, /210,00/);
  });
});
