/**
 * Regressão: gravação BYTEA sem prisma.storedObject.create(Bytes)
 * (causa InvalidArg / "JS functions cannot..." com adapter Neon em produção).
 *
 * Também: SQL raw DEVE qualificar o schema (`nina."StoredObject"`) porque
 * PrismaNeon/PrismaPg com `{ schema }` NÃO reescreve `$executeRaw`.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";

describe("storedObject bytes path", () => {
  it("storeFamilyFile uses decode(base64) raw SQL, not Prisma Bytes create", () => {
    const src = readFileSync(path.join(process.cwd(), "src/lib/storage.ts"), "utf8");
    // Remove block comments before asserting — o docblock menciona o antipadrão de propósito
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    assert.match(code, /decode\(\$\{input\.dataBase64\}, 'base64'\)/);
    assert.match(code, /encode\("data", 'base64'\)/);
    assert.doesNotMatch(code, /prisma\.storedObject\.create\s*\(/);
    assert.doesNotMatch(code, /Uint8Array\.from\(/);
  });

  it("raw SQL uses schema-qualified StoredObject via resolveNinaSchema", () => {
    const src = readFileSync(path.join(process.cwd(), "src/lib/storage.ts"), "utf8");
    assert.match(src, /resolveNinaSchema/);
    assert.match(src, /storedObjectRelation/);
    assert.match(src, /Prisma\.raw\(`"\$\{schema\}"\."StoredObject"`\)/);
    // Unqualified bare table in INSERT/FROM/DELETE must not remain
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    assert.doesNotMatch(code, /INSERT INTO "StoredObject"/);
    assert.doesNotMatch(code, /FROM "StoredObject"/);
    assert.doesNotMatch(code, /DELETE FROM "StoredObject"/);
    assert.match(code, /INSERT INTO \$\{storedObjectRelation\(\)\}/);
    assert.match(code, /FROM \$\{storedObjectRelation\(\)\}/);
    assert.match(code, /DELETE FROM \$\{storedObjectRelation\(\)\}/);
  });

  it("user-facing write error never embeds Prisma message", () => {
    const src = readFileSync(path.join(process.cwd(), "src/lib/storage.ts"), "utf8");
    assert.match(src, /STORAGE_USER_ERRORS/);
    assert.doesNotMatch(src, /Não foi possível guardar a fatura \(\$\{message/);
    assert.doesNotMatch(src, /message\.slice\(0,\s*120\)/);
  });
});
