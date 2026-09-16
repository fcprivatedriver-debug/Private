import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertAllowedReceipt,
  assertSafeStorageKey,
  MAX_RECEIPT_BYTES,
  StorageError,
} from "./storage";
import { recognizeReceipt } from "@/lib/ocr";

describe("receipt storage validation", () => {
  it("aceita JPEG/PNG/WEBP/PDF dentro do limite", () => {
    assert.equal(assertAllowedReceipt({ fileName: "a.jpg", mimeType: "image/jpeg", sizeBytes: 100 }).mimeType, "image/jpeg");
    assert.equal(assertAllowedReceipt({ fileName: "a.png", mimeType: "image/png", sizeBytes: 100 }).mimeType, "image/png");
    assert.equal(assertAllowedReceipt({ fileName: "a.webp", mimeType: "image/webp", sizeBytes: 100 }).mimeType, "image/webp");
    assert.equal(assertAllowedReceipt({ fileName: "a.pdf", mimeType: "application/pdf", sizeBytes: 100 }).mimeType, "application/pdf");
  });

  it("rejeita demasiado grande", () => {
    assert.throws(
      () => assertAllowedReceipt({ fileName: "a.jpg", mimeType: "image/jpeg", sizeBytes: MAX_RECEIPT_BYTES + 1 }),
      (e: unknown) => e instanceof StorageError && e.code === "TOO_LARGE",
    );
  });

  it("rejeita tipo inválido", () => {
    assert.throws(
      () => assertAllowedReceipt({ fileName: "a.exe", mimeType: "application/octet-stream", sizeBytes: 10 }),
      (e: unknown) => e instanceof StorageError && e.code === "INVALID_TYPE",
    );
  });

  it("bloqueia path traversal na key", () => {
    assert.throws(() => assertSafeStorageKey("../etc/passwd"));
    assert.equal(assertSafeStorageKey("families/abc/file.jpg"), "families/abc/file.jpg");
  });
});

describe("OCR honesty", () => {
  it("não devolve total 2487 fictício", async () => {
    const r = await recognizeReceipt({ fileName: "continente.jpg" });
    assert.equal(r.available, false);
    assert.equal(r.totalCents, 0);
    assert.notEqual(r.totalCents, 2487);
    assert.ok(r.unavailableReason);
  });
});
