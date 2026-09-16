/**
 * Storage de anexos (faturas).
 *
 * Produção Vercel: o filesystem da app é efémero/read-only → NÃO usar cwd/uploads.
 * Backend por omissão: Postgres/Neon (StoredObject) — sem serviço pago extra.
 * Opcional: Vercel Blob se BLOB_READ_WRITE_TOKEN estiver definido (futuro).
 */

import { mkdir, writeFile, readFile, unlink } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
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
    throw new StorageError("Ficheiro vazio.", "INVALID_TYPE");
  }
  if (input.sizeBytes > MAX_RECEIPT_BYTES) {
    throw new StorageError(
      `Ficheiro demasiado grande (máx. ${Math.round(MAX_RECEIPT_BYTES / (1024 * 1024))} MB).`,
      "TOO_LARGE",
    );
  }
  const mimeType = detectMime(input.fileName, input.mimeType);
  if (!ALLOWED_RECEIPT_MIME.has(mimeType)) {
    throw new StorageError(
      "Formato não suportado. Usa JPEG, PNG, WEBP ou PDF.",
      "INVALID_TYPE",
    );
  }
  return { mimeType };
}

function buildStorageKey(familyId: string, fileName: string): string {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
  return `families/${familyId}/${Date.now()}-${randomUUID().slice(0, 8)}-${safeName}`;
}

function localRoot(): string {
  // Prefer /tmp on serverless; cwd/uploads only in local/dev.
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

/**
 * Guarda ficheiro de forma persistente.
 * Preferência: DB (Neon). Em desenvolvimento também espelha em disco local opcionalmente.
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

  // Backend persistente: Neon BYTEA (sem custo extra / sem Blob obrigatório)
  try {
    await prisma.storedObject.create({
      data: {
        familyId: input.familyId,
        storageKey,
        fileName: input.fileName.slice(0, 180),
        mimeType,
        sizeBytes: input.bytes.length,
        backend: "db",
        data: Uint8Array.from(input.bytes),
        createdById: input.createdById ?? null,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "falha ao gravar";
    throw new StorageError(
      `Não foi possível guardar a fatura (${message.slice(0, 120)}).`,
      "WRITE_FAILED",
    );
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
  const row = await prisma.storedObject.findUnique({ where: { storageKey: key } });
  if (row?.data) {
    return {
      bytes: Buffer.from(row.data),
      mimeType: row.mimeType,
      fileName: row.fileName,
    };
  }

  // Legacy local fallback (dev / old keys)
  try {
    const bytes = await readLocal(key);
    return {
      bytes,
      mimeType: detectMime(key),
      fileName: path.basename(key),
    };
  } catch {
    throw new StorageError("Ficheiro não encontrado.", "NOT_FOUND");
  }
}

export async function deleteStoredFile(storageKey: string): Promise<void> {
  const key = assertSafeStorageKey(storageKey);
  await prisma.storedObject.deleteMany({ where: { storageKey: key } });
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
    throw new StorageError("Invalid storage key", "INVALID_TYPE");
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
