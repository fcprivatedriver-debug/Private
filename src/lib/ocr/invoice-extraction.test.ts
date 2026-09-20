/**
 * Regressão: schema de extracção de fatura + normalização (sem inventar).
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  invoiceExtractionSchema,
  extractionReadyToConfirm,
} from "@/lib/ocr/analyze-invoice";
import { DEFAULT_EXPENSE_CATEGORIES } from "@/domain/categories";

describe("invoice extraction schema", () => {
  it("aceita extracção válida com nulls", () => {
    const parsed = invoiceExtractionSchema.safeParse({
      supplier: "EDP",
      total: 87.43,
      currency: "EUR",
      invoiceDate: "2026-09-18",
      dueDate: "2026-09-30",
      invoiceNumber: "FT 123",
      category: "luz",
      description: "EDP",
      vat: 16.0,
      confidence: {
        supplier: 0.95,
        total: 0.92,
        invoiceDate: 0.9,
        dueDate: 0.85,
        category: 0.88,
      },
    });
    assert.equal(parsed.success, true);
  });

  it("rejeita confiança fora de 0–1", () => {
    const parsed = invoiceExtractionSchema.safeParse({
      supplier: null,
      total: null,
      currency: null,
      invoiceDate: null,
      dueDate: null,
      invoiceNumber: null,
      category: null,
      description: null,
      confidence: {
        supplier: 2,
        total: 0,
        invoiceDate: 0,
        dueDate: 0,
        category: 0,
      },
    });
    assert.equal(parsed.success, false);
  });

  it("readyToConfirm exige total+data+categoria com confiança", () => {
    assert.equal(
      extractionReadyToConfirm({
        supplier: "EDP",
        total: 87.43,
        currency: "EUR",
        invoiceDate: "2026-09-18",
        dueDate: null,
        invoiceNumber: null,
        category: "luz",
        description: "EDP",
        vat: null,
        confidence: {
          supplier: 0.9,
          total: 0.9,
          invoiceDate: 0.9,
          dueDate: 0.2,
          category: 0.85,
        },
      }),
      true,
    );
    assert.equal(
      extractionReadyToConfirm({
        supplier: null,
        total: null,
        currency: null,
        invoiceDate: null,
        dueDate: null,
        invoiceNumber: null,
        category: null,
        description: null,
        vat: null,
        confidence: {
          supplier: 0.1,
          total: 0.1,
          invoiceDate: 0.1,
          dueDate: 0.1,
          category: 0.1,
        },
      }),
      false,
    );
  });

  it("categorias incluem Eletricidade e Eletricidade/Gás (sem label Luz)", () => {
    const names = DEFAULT_EXPENSE_CATEGORIES.map((c) => c.name) as string[];
    assert.ok(names.includes("Eletricidade"));
    assert.ok(names.includes("Eletricidade/Gás"));
    assert.ok(names.includes("Gás"));
    assert.equal(names.includes("Luz"), false);
    assert.ok(DEFAULT_EXPENSE_CATEGORIES.some((c) => c.slug === "luz"));
    assert.ok(DEFAULT_EXPENSE_CATEGORIES.some((c) => c.slug === "eletricidade-gas"));
  });
});
