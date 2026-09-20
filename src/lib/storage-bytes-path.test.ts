/**
 * Regressão: gravação BYTEA sem prisma.storedObject.create(Bytes)
 * (causa InvalidArg / "JS functions cannot..." com adapter Neon em produção).
 *
 * Também: SQL raw DEVE qualificar o schema (`nina."StoredObject"`) porque
 * PrismaNeon/PrismaPg com `{ schema }` NÃO reescreve `$executeRaw`.
 *
 * E: NENHUM caminho de upload em `src/` pode voltar a chamar
 * `prisma.storedObject.create` com Bytes/Uint8Array.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

function walkTsFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next" || name === "dist") continue;
    const full = path.join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walkTsFiles(full, out);
    else if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(name) && !name.endsWith(".test.ts")) {
      out.push(full);
    }
  }
  return out;
}

describe("storedObject bytes path", () => {
  it("storeFamilyFile uses decode(base64) raw SQL, not Prisma Bytes create", () => {
    const src = readFileSync(path.join(process.cwd(), "src/lib/storage.ts"), "utf8");
    // Remove block comments before asserting — o docblock menciona o antipadrão de propósito
    const code = stripComments(src);
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
    const code = stripComments(src);
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

  it("no src file calls prisma.storedObject.create (Bytes path regression)", () => {
    const files = walkTsFiles(path.join(process.cwd(), "src"));
    const offenders: string[] = [];
    for (const file of files) {
      const code = stripComments(readFileSync(file, "utf8"));
      if (/prisma\.storedObject\.create\s*\(/.test(code)) {
        offenders.push(path.relative(process.cwd(), file));
      }
      // Antipadrão clássico do InvalidArg Neon: passar Uint8Array/Buffer no data: do create
      if (
        /storedObject\.create\s*\(/.test(code) &&
        /(Uint8Array|Buffer\.from|bytes\s*:)/.test(code)
      ) {
        offenders.push(path.relative(process.cwd(), file) + " (Bytes payload)");
      }
    }
    assert.deepEqual(
      offenders,
      [],
      `Forbidden prisma.storedObject.create in:\n${offenders.join("\n")}`,
    );
  });

  it("all upload write paths go through insertStoredObjectProps / storeFamilyFile / storeProfilePhoto", () => {
    const storage = stripComments(
      readFileSync(path.join(process.cwd(), "src/lib/storage.ts"), "utf8"),
    );
    assert.match(storage, /async function insertStoredObjectProps/);
    assert.match(storage, /export async function storeFamilyFile/);
    assert.match(storage, /export async function storeProfilePhoto/);

    const receipts = stripComments(
      readFileSync(path.join(process.cwd(), "src/lib/receipts.ts"), "utf8"),
    );
    assert.match(receipts, /storeFamilyFile\s*\(/);
    assert.doesNotMatch(receipts, /storedObject\.create/);

    const profile = stripComments(
      readFileSync(path.join(process.cwd(), "src/actions/profile-photo.ts"), "utf8"),
    );
    assert.match(profile, /storeProfilePhoto\s*\(/);
    assert.doesNotMatch(profile, /storedObject\.create/);

    const capture = stripComments(
      readFileSync(path.join(process.cwd(), "src/actions/capture.ts"), "utf8"),
    );
    assert.match(capture, /storeReceiptFromFormFile\s*\(/);
    assert.doesNotMatch(capture, /storedObject\.create/);
  });
});
