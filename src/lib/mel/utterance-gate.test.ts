/**
 * Regressão: gate MEL — "ond"/"onde" não disparam mobilidade.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { gateMelUtterance } from "./utterance-gate";

describe("gateMelUtterance", () => {
  it("ond e onde pedem completar — sem mobilidade", () => {
    assert.equal(gateMelUtterance("ond").action, "complete");
    assert.equal(gateMelUtterance("onde").action, "complete");
    assert.equal(gateMelUtterance("ond?").action, "complete");
  });

  it("onde gastei → finanças", () => {
    assert.equal(gateMelUtterance("onde gastei mais este mês?").action, "finance_where");
    assert.equal(gateMelUtterance("onde tenho mais despesas?").action, "finance_where");
  });

  it("carregadores perto → mobilidade EV", () => {
    const g = gateMelUtterance("onde há carregadores perto de mim?");
    assert.equal(g.action, "mobility");
    if (g.action === "mobility") assert.equal(g.mode, "ev");
  });

  it("postos combustível perto → mobilidade fuel", () => {
    const g = gateMelUtterance("postos de combustível perto de mim");
    assert.equal(g.action, "mobility");
    if (g.action === "mobility") assert.equal(g.mode, "fuel");
  });
});
