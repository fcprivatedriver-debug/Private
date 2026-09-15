import { mkdir, writeFile, readFile, unlink } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const UPLOAD_ROOT = path.join(process.cwd(), "uploads");

export type StoredFile = {
  storageKey: string;
  url: string;
  sizeBytes: number;
};

export async function storeFamilyFile(input: {
  familyId: string;
  fileName: string;
  mimeType: string;
  bytes: Buffer;
}): Promise<StoredFile> {
  const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
  const storageKey = path.join(
    "families",
    input.familyId,
    `${Date.now()}-${randomUUID().slice(0, 8)}-${safeName}`,
  );
  const abs = path.join(UPLOAD_ROOT, storageKey);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, input.bytes);
  return {
    storageKey: storageKey.replace(/\\/g, "/"),
    url: `/api/uploads/${storageKey.replace(/\\/g, "/")}`,
    sizeBytes: input.bytes.length,
  };
}

export async function readStoredFile(storageKey: string): Promise<Buffer> {
  const abs = path.join(UPLOAD_ROOT, storageKey);
  return readFile(abs);
}

export async function deleteStoredFile(storageKey: string): Promise<void> {
  const abs = path.join(UPLOAD_ROOT, storageKey);
  await unlink(abs).catch(() => undefined);
}

export function assertSafeStorageKey(key: string): string {
  const normalized = key.replace(/\\/g, "/");
  if (
    !normalized ||
    normalized.includes("..") ||
    normalized.startsWith("/") ||
    normalized.includes("\0")
  ) {
    throw new Error("Invalid storage key");
  }
  return normalized;
}
