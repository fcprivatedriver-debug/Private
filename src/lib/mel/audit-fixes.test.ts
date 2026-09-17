import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canEditFinances } from "@/domain/household";
import { recognizeReceipt } from "@/lib/ocr";
import { compareBasket, PRODUCTS_UNAVAILABLE_REASON } from "@/lib/products";
import { getFuelUnavailableMessage } from "@/lib/mobility/fuel";
import { getEvUnavailableMessage } from "@/lib/mobility/ev";
import { makeInviteCode } from "@/domain/household";

describe("Family permissions", () => {
  it("VIEWER não edita finanças", () => {
    assert.equal(canEditFinances("VIEWER"), false);
    assert.equal(canEditFinances("MEMBER"), true);
    assert.equal(canEditFinances("ADMIN"), true);
    assert.equal(canEditFinances("OWNER"), true);
  });
});

describe("OCR sem dados fictícios", () => {
  it("recognizeReceipt não devolve 2487", async () => {
    const r = await recognizeReceipt({ fileName: "continente.jpg" });
    assert.equal(r.available, false);
    assert.equal(r.totalCents, 0);
    assert.notEqual(r.totalCents, 2487);
    assert.ok(r.unavailableReason);
  });
});

describe("Providers honestos", () => {
  it("comparador sem preços fictícios", async () => {
    const r = await compareBasket(["Leite", "Arroz"]);
    assert.equal(r.best, null);
    assert.ok(r.unavailableReason || PRODUCTS_UNAVAILABLE_REASON);
    assert.ok(r.quotes.every((q) => !q.complete || q.totalCents === 0 || q.missing.length > 0));
  });
  it("combustível pede GPS ou indisponível", () => {
    assert.match(getFuelUnavailableMessage(false), /localização/i);
    assert.match(getFuelUnavailableMessage(true), /indisponíve|DGEG|acordo/i);
  });
  it("EV pede GPS ou indisponível", () => {
    assert.match(getEvUnavailableMessage(false), /localização/i);
    assert.match(getEvUnavailableMessage(true), /indisponíve|MOBI/i);
  });
});

describe("Identidade", () => {
  it("convites usam ADDY- e não NINA-", () => {
    const code = makeInviteCode();
    assert.match(code, /^ADDY-/);
    assert.doesNotMatch(code, /^NINA-/);
  });
});
