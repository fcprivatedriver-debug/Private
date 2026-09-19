"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireFamilyContext } from "@/lib/session";
import {
  deleteStoredFile,
  StorageError,
  STORAGE_USER_ERRORS,
  storageKeyFromUploadUrl,
  storeProfilePhoto,
} from "@/lib/storage";
import type { MelSpace } from "@/actions/household";

function revalidateAll() {
  revalidatePath("/", "layout");
}

async function clearStoredUrl(url: string | null | undefined) {
  const key = storageKeyFromUploadUrl(url);
  if (!key) return;
  try {
    await deleteStoredFile(key);
  } catch {
    // ficheiro já inexistente — ok
  }
}

export async function uploadSpacePhoto(formData: FormData): Promise<
  | { ok: true; url: string; space: MelSpace }
  | { ok: false; error: string }
> {
  const { session, membership, family } = await requireFamilyContext();
  const spaceRaw = String(formData.get("space") || "personal");
  const space: MelSpace = spaceRaw === "family" ? "family" : "personal";
  const file = formData.get("file");

  if (!(file instanceof File) || file.size <= 0) {
    return { ok: false, error: STORAGE_USER_ERRORS.EMPTY };
  }

  const bytes = Buffer.from(await file.arrayBuffer());

  try {
    const stored = await storeProfilePhoto({
      familyId: family.id,
      ownerKind: space === "family" ? "family" : "user",
      ownerId: space === "family" ? family.id : session.user.id,
      fileName: file.name || "photo.jpg",
      mimeType: file.type || "image/jpeg",
      bytes,
      createdById: session.user.id,
    });

    if (space === "personal") {
      const prev = membership.user.image || membership.photoUrl;
      await prisma.user.update({
        where: { id: session.user.id },
        data: { image: stored.url },
      });
      await prisma.familyMember.update({
        where: { id: membership.id },
        data: { photoUrl: stored.url },
      });
      if (prev && prev !== stored.url) await clearStoredUrl(prev);
    } else {
      const prev = family.image;
      await prisma.family.update({
        where: { id: family.id },
        data: { image: stored.url },
      });
      if (prev && prev !== stored.url) await clearStoredUrl(prev);
    }

    revalidateAll();
    return { ok: true, url: stored.url, space };
  } catch (err) {
    if (err instanceof StorageError) {
      if (err.code === "WRITE_FAILED") {
        return { ok: false, error: "Não foi possível guardar a fotografia. Tenta novamente." };
      }
      return { ok: false, error: err.message };
    }
    console.error("[profile-photo] upload failed", err);
    return { ok: false, error: "Não foi possível guardar a fotografia. Tenta novamente." };
  }
}

export async function removeSpacePhoto(
  space: MelSpace,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { session, membership, family } = await requireFamilyContext();

  try {
    if (space === "personal") {
      const prev = membership.user.image || membership.photoUrl;
      await prisma.user.update({
        where: { id: session.user.id },
        data: { image: null },
      });
      await prisma.familyMember.update({
        where: { id: membership.id },
        data: { photoUrl: null },
      });
      await clearStoredUrl(prev);
    } else {
      const prev = family.image;
      await prisma.family.update({
        where: { id: family.id },
        data: { image: null },
      });
      await clearStoredUrl(prev);
    }
    revalidateAll();
    return { ok: true };
  } catch (err) {
    console.error("[profile-photo] remove failed", err);
    return { ok: false, error: "Não foi possível remover a fotografia." };
  }
}
