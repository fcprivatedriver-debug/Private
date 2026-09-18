/**
 * Helpers partilhados para anexar faturas a despesas.
 */

import { prisma } from "@/lib/db";
import {
  storeFamilyFile,
  deleteStoredFile,
  storageKeyFromUploadUrl,
  isPdfMime,
  isImageMime,
  StorageError,
  type StoredFile,
} from "@/lib/storage";

export async function storeReceiptFromFormFile(opts: {
  familyId: string;
  userId: string;
  file: File;
}): Promise<
  | { ok: true; stored: StoredFile; kind: "image" | "pdf" }
  | { ok: false; error: string }
> {
  try {
    const bytes = Buffer.from(await opts.file.arrayBuffer());
    const stored = await storeFamilyFile({
      familyId: opts.familyId,
      fileName: opts.file.name || "fatura.jpg",
      mimeType: opts.file.type || "image/jpeg",
      bytes,
      createdById: opts.userId,
    });
    const kind: "image" | "pdf" = isPdfMime(stored.mimeType)
      ? "pdf"
      : isImageMime(stored.mimeType)
        ? "image"
        : "image";
    if (!isPdfMime(stored.mimeType) && !isImageMime(stored.mimeType)) {
      await deleteStoredFile(stored.storageKey);
      return { ok: false, error: "Formato não suportado. Usa JPEG, PNG, WEBP ou PDF." };
    }
    return { ok: true, stored, kind };
  } catch (err) {
    if (err instanceof StorageError) {
      // Mensagens já são seguras (sem Prisma/Neon)
      return { ok: false, error: err.message };
    }
    console.error("[receipt] store failed", err);
    return { ok: false, error: "Não foi possível guardar a fatura. Tenta novamente." };
  }
}

export async function clearReceiptUrl(url: string | null | undefined): Promise<void> {
  const key = storageKeyFromUploadUrl(url);
  if (key) await deleteStoredFile(key);
}

/** Confirma que a URL /api/uploads/... pertence à família (anti-spoofing no FormData). */
export async function familyOwnsReceiptUrl(
  familyId: string,
  url: string | null | undefined,
): Promise<boolean> {
  const key = storageKeyFromUploadUrl(url);
  if (!key) return false;
  const row = await prisma.storedObject.findFirst({
    where: { familyId, storageKey: key },
    select: { id: true },
  });
  return Boolean(row);
}

/** Resolve URL de fatura da família para pré-anexar em Nova despesa. */
export async function resolveFamilyReceiptAttachment(
  familyId: string,
  url: string | null | undefined,
): Promise<{ receiptImageUrl: string | null; receiptPdfUrl: string | null } | null> {
  const key = storageKeyFromUploadUrl(url);
  if (!key) return null;
  const row = await prisma.storedObject.findFirst({
    where: { familyId, storageKey: key },
    select: { storageKey: true, mimeType: true },
  });
  if (!row) return null;
  const resolved = `/api/uploads/${row.storageKey}`;
  if (isPdfMime(row.mimeType)) {
    return { receiptImageUrl: null, receiptPdfUrl: resolved };
  }
  return { receiptImageUrl: resolved, receiptPdfUrl: null };
}
