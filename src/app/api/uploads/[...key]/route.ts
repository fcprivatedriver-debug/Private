import { auth } from "@/lib/auth";
import { apiError } from "@/lib/utils";
import { assertSafeStorageKey, readStoredFile, StorageError } from "@/lib/storage";
import { prisma } from "@/lib/db";
import { getActiveFamilyForUser } from "@/lib/session";

type Ctx = { params: Promise<{ key: string[] }> };

/**
 * Serve private receipt / attachment / profile photo files for the authenticated family.
 * Keys are stored on Expense.receiptImageUrl / receiptPdfUrl, User.image, Family.image
 * as /api/uploads/...
 *
 * Autorização server-side:
 * - membro da família correcta
 * - despesa PERSONAL: só o próprio membro (nunca outro, mesmo OWNER)
 * - despesa FAMILY: qualquer membro da família
 * - órfão (sem despesa): membro da família dona do StoredObject
 * - fotografia de perfil (User.image / Family.image / FamilyMember.photoUrl): família activa
 *
 * Lê de Neon StoredObject — nunca depende de cwd/uploads no Vercel.
 */
export async function GET(_request: Request, context: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return apiError("Login necessário", 401);

  let storageKey: string;
  try {
    const { key } = await context.params;
    storageKey = assertSafeStorageKey(key.join("/"));
  } catch {
    return apiError("Pedido inválido", 400);
  }
  const urlPath = `/api/uploads/${storageKey}`;

  const membership = await getActiveFamilyForUser(session.user.id);
  if (!membership) return apiError("Sem família", 403);

  const isProfilePhotoKey = storageKey.startsWith("profiles/");

  if (isProfilePhotoKey) {
    const allowed =
      membership.user.image === urlPath ||
      membership.photoUrl === urlPath ||
      membership.family.image === urlPath ||
      (await prisma.user.count({
        where: {
          image: urlPath,
          memberships: { some: { familyId: membership.familyId } },
        },
      })) > 0 ||
      (await prisma.familyMember.count({
        where: { familyId: membership.familyId, photoUrl: urlPath },
      })) > 0 ||
      (await prisma.family.count({
        where: { id: membership.familyId, image: urlPath },
      })) > 0 ||
      (await prisma.storedObject.count({
        where: { familyId: membership.familyId, storageKey },
      })) > 0;

    if (!allowed) return apiError("Sem permissão para ver esta fotografia.", 403);
  } else {
    const expense = await prisma.expense.findFirst({
      where: {
        familyId: membership.familyId,
        OR: [{ receiptImageUrl: urlPath }, { receiptPdfUrl: urlPath }],
      },
    });

    if (expense) {
      if (expense.scope === "PERSONAL") {
        const isOwn =
          expense.memberId === membership.id || expense.createdById === session.user.id;
        if (!isOwn) {
          return apiError("Sem permissão para ver esta fatura.", 403);
        }
      }
    } else {
      // Fatura ainda não associada a despesa — permitir se StoredObject é da família.
      const orphan = await prisma.storedObject.findFirst({
        where: { familyId: membership.familyId, storageKey },
        select: { id: true, createdById: true },
      });
      if (!orphan) return apiError("Ficheiro não encontrado", 404);
      // Preferência: só o autor vê órfãos (privacidade antes de anexar).
      if (orphan.createdById && orphan.createdById !== session.user.id) {
        return apiError("Sem permissão para ver esta fatura.", 403);
      }
    }
  }

  try {
    const file = await readStoredFile(storageKey);
    return new Response(new Uint8Array(file.bytes), {
      headers: {
        "Content-Type": file.mimeType,
        "Content-Length": String(file.bytes.length),
        "Content-Disposition": `inline; filename="${file.fileName.replace(/"/g, "")}"`,
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (err) {
    if (err instanceof StorageError && err.code === "NOT_FOUND") {
      return apiError("Ficheiro não encontrado", 404);
    }
    console.error("[uploads] read failed", err);
    return apiError("Não foi possível ler o ficheiro.", 500);
  }
}
