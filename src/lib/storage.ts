import { mkdir, writeFile, readFile, unlink } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const UPLOAD_ROOT = path.join(process.cwd(), "uploads");

export type StoredFile = {
  storageKey: string;
  url: string;
  sizeBytes: number;
};

export async function storeDriverFile(input: {
  driverUserId: string;
  fileName: string;
  mimeType: string;
  bytes: Buffer;
}): Promise<StoredFile> {
  const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
  const storageKey = path.join(
    "drivers",
    input.driverUserId,
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
  try {
    await unlink(path.join(UPLOAD_ROOT, storageKey));
  } catch {
    // ignore missing
  }
}

export function assertSafeStorageKey(storageKey: string): string {
  const normalized = storageKey.replace(/\\/g, "/");
  if (
    normalized.includes("..") ||
    normalized.startsWith("/") ||
    !normalized.startsWith("drivers/")
  ) {
    throw new Error("Invalid storage key");
  }
  return normalized;
}
