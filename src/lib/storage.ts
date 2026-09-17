/**
 * Storage de anexos (faturas).
 *
 * Produção Vercel: o filesystem da app é efémero/read-only → NÃO usar cwd/uploads.
 * Backend por omissão: Postgres/Neon (StoredObject) — sem serviço pago extra.
 *
 * IMPORTANTE — Bytes / Neon:
 * `prisma.storedObject.create({ data: { data: Uint8Array } })` com o driver adapter
 * Neon provoca em produção:
 *   Raw query failed / InvalidArg / "JS functions cannot be represented as a serde_json::Value"
 * Por isso gravamos/lemos BYTEA via SQL com decode/encode(base64), parâmetros só TEXT.
 */

import { mkdir, writeFile, readFile, unlink } from "fs/promises";
import path from "path";
import { createHash, randomBytes, randomUUID } from "crypto";
import { prisma } from "@/lib/db";

export const MAX_RECEIPT_BYTES = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_RECEIPT_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

export type StoredFile = {
  storageKey: string;
  url: string;
  sizeBytes: number;
  mimeType: string;
  fileName: string;
  backend: "db" | "local" | "blob";
};

export class StorageError extends Error {
  constructor(
    message: string,
    public code:
      | "TOO_LARGE"
      | "INVALID_TYPE"
      | "NOT_FOUND"
      | "WRITE_FAILED"
      | "NOT_CONFIGURED",
  ) {
    super(message);
    this.name = "StorageError";
  }
}

/** Mensagens seguras para o utilizador — nunca expor Prisma/Neon/stack. */
export const STORAGE_USER_ERRORS = {
  WRITE_FAILED: "Não foi possível guardar a fatura. Tenta novamente.",
  READ_FAILED: "Não foi possível ler a fatura.",
  NOT_FOUND: "Ficheiro não encontrado.",
  TOO_LARGE: `Ficheiro demasiado grande (máx. ${Math.round(MAX_RECEIPT_BYTES / (1024 * 1024))} MB).`,
  INVALID_TYPE: "Formato não suportado. Usa JPEG, PNG, WEBP ou PDF.",
  EMPTY: "Ficheiro vazio.",
} as const;

function detectMime(fileName: string, declared?: string): string {
  const fromName = fileName.toLowerCase();
  if (fromName.endsWith(".pdf")) return "application/pdf";
  if (fromName.endsWith(".png")) return "image/png";
  if (fromName.endsWith(".webp")) return "image/webp";
  if (fromName.endsWith(".jpg") || fromName.endsWith(".jpeg")) return "image/jpeg";
  return (declared || "").toLowerCase() || "application/octet-stream";
}

export function assertAllowedReceipt(input: {
  fileName: string;
  mimeType?: string;
  sizeBytes: number;
}): { mimeType: string } {
  if (input.sizeBytes <= 0) {
    throw new StorageError(STORAGE_USER_ERRORS.EMPTY, "INVALID_TYPE");
  }
  if (input.sizeBytes > MAX_RECEIPT_BYTES) {
    throw new StorageError(STORAGE_USER_ERRORS.TOO_LARGE, "TOO_LARGE");
  }
  const mimeType = detectMime(input.fileName, input.mimeType);
  if (!ALLOWED_RECEIPT_MIME.has(mimeType)) {
    throw new StorageError(STORAGE_USER_ERRORS.INVALID_TYPE, "INVALID_TYPE");
  }
  return { mimeType };
}

function buildStorageKey(familyId: string, fileName: string): string {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
  return `families/${familyId}/${Date.now()}-${randomUUID().slice(0, 8)}-${safeName}`;
}

function newStoredObjectId(): string {
  // Compatível com @default(cuid()) — id texto único sem depender de Bytes/Prisma create
  return `c${createHash("sha256").update(randomBytes(32)).digest("hex").slice(0, 24)}`;
}

function localRoot(): string {
  if (process.env.VERCEL || process.env.USE_TMP_UPLOADS === "true") {
    return path.join("/tmp", "addyknow-uploads");
  }
  return path.join(process.cwd(), "uploads");
}

async function storeLocal(storageKey: string, bytes: Buffer): Promise<void> {
  const abs = path.join(localRoot(), storageKey);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, bytes);
}

async function readLocal(storageKey: string): Promise<Buffer> {
  return readFile(path.join(localRoot(), storageKey));
}

async function deleteLocal(storageKey: string): Promise<void> {
  await unlink(path.join(localRoot(), storageKey)).catch(() => undefined);
}

function logStorageError(op: string, err: unknown): void {
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;
  console.error(`[storage] ${op} failed:`, message);
  if (stack) console.error(stack);
}

/**
 * INSERT BYTEA via decode(base64) — evita Prisma Bytes + Neon adapter InvalidArg.
 */
async function insertStoredObjectProps(input: {
  id: string;
  familyId: string;
  storageKey: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  dataBase64: string;
  createdById: string | null;
}): Promise<void> {
  await prisma.$executeRaw`
    INSERT INTO "StoredObject" (
      "id", "familyId", "storageKey", "fileName", "mimeType",
      "sizeBytes", "backend", "data", "createdById", "createdAt"
    ) VALUES (
      ${input.id},
      ${input.familyId},
      ${input.storageKey},
      ${input.fileName},
      ${input.mimeType},
      ${input.sizeBytes},
      ${"db"},
      decode(${input.dataBase64}, 'base64'),
      ${input.createdById},
      CURRENT_TIMESTAMP
    )
  `;
}

/**
 * SELECT encode(BYTEA → base64) — evita deserialização Bytes pelo adapter.
 */
async function selectStoredObjectByKey(storageKey: string): Promise<{
  dataBase64: string | null;
  mimeType: string;
  fileName: string;
  externalUrl: string | null;
} | null> {
  const rows = await prisma.$queryRaw<
    Array<{
      data_b64: string | null;
      mimeType: string;
      fileName: string;
      externalUrl: string | null;
    }>
  >`
    SELECT
      encode("data", 'base64') AS data_b64,
      "mimeType",
      "fileName",
      "externalUrl"
    FROM "StoredObject"
    WHERE "storageKey" = ${storageKey}
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return null;
  return {
    dataBase64: row.data_b64,
    mimeType: row.mimeType,
    fileName: row.fileName,
    externalUrl: row.externalUrl,
  };
}

/**
 * Guarda ficheiro de forma persistente na Neon (BYTEA), sem filesystem Vercel.
 */
export async function storeFamilyFile(input: {
  familyId: string;
  fileName: string;
  mimeType: string;
  bytes: Buffer;
  createdById?: string | null;
}): Promise<StoredFile> {
  const { mimeType } = assertAllowedReceipt({
    fileName: input.fileName,
    mimeType: input.mimeType,
    sizeBytes: input.bytes.length,
  });

  const storageKey = buildStorageKey(input.familyId, input.fileName);
  const url = `/api/uploads/${storageKey}`;
  const id = newStoredObjectId();
  const dataBase64 = input.bytes.toString("base64");

  try {
    await insertStoredObjectProps({
      id,
      familyId: input.familyId,
      storageKey,
      fileName: input.fileName.slice(0, 180),
      mimeType,
      sizeBytes: input.bytes.length,
      dataBase64,
      createdById: input.createdById ?? null,
    });
  } catch (err) {
    logStorageError("insertStoredObject", err);
    throw new StorageError(STORAGE_USER_ERRORS.WRITE_FAILED, "WRITE_FAILED");
  }

  // Espelho local só em dev (não é a fonte de verdade)
  if (!process.env.VERCEL && process.env.NODE_ENV !== "production") {
    try {
      await storeLocal(storageKey, input.bytes);
    } catch {
      // ignore — DB já tem o ficheiro
    }
  }

  return {
    storageKey,
    url,
    sizeBytes: input.bytes.length,
    mimeType,
    fileName: input.fileName,
    backend: "db",
  };
}

export async function readStoredFile(storageKey: string): Promise<{
  bytes: Buffer;
  mimeType: string;
  fileName: string;
}> {
  const key = assertSafeStorageKey(storageKey);

  try {
    const row = await selectStoredObjectByKey(key);
    if (row?.dataBase64) {
      return {
        bytes: Buffer.from(row.dataBase64, "base64"),
        mimeType: row.mimeType,
        fileName: row.fileName,
      };
    }
    if (row?.externalUrl) {
      throw new StorageError(
        "Ficheiro em storage externo ainda não suportado neste endpoint.",
        "NOT_FOUND",
      );
    }
  } catch (err) {
    if (err instanceof StorageError) throw err;
    logStorageError("selectStoredObject", err);
    throw new StorageError(STORAGE_USER_ERRORS.READ_FAILED, "NOT_FOUND");
  }

  // Legacy local só em desenvolvimento — nunca no Vercel
  const allowLocal =
    !process.env.VERCEL &&
    process.env.NODE_ENV !== "production" &&
    process.env.USE_TMP_UPLOADS !== "false";

  if (allowLocal) {
    try {
      const bytes = await readLocal(key);
      return {
        bytes,
        mimeType: detectMime(key),
        fileName: path.basename(key),
      };
    } catch {
      // fall through
    }
  }

  throw new StorageError(STORAGE_USER_ERRORS.NOT_FOUND, "NOT_FOUND");
}

export async function deleteStoredFile(storageKey: string): Promise<void> {
  const key = assertSafeStorageKey(storageKey);
  await prisma.$executeRaw`DELETE FROM "StoredObject" WHERE "storageKey" = ${key}`;
  await deleteLocal(key);
}

export function assertSafeStorageKey(key: string): string {
  const normalized = key.replace(/\\/g, "/");
  if (
    !normalized ||
    normalized.includes("..") ||
    normalized.startsWith("/") ||
    normalized.includes("\0")
  ) {
    throw new StorageError("Pedido inválido.", "INVALID_TYPE");
  }
  return normalized;
}

export function storageKeyFromUploadUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const prefix = "/api/uploads/";
  if (!url.startsWith(prefix)) return null;
  try {
    return assertSafeStorageKey(url.slice(prefix.length));
  } catch {
    return null;
  }
}

export function isImageMime(mime: string): boolean {
  return mime.startsWith("image/");
}

export function isPdfMime(mime: string): boolean {
  return mime === "application/pdf";
}
