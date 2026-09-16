import { auth } from "@/lib/auth";
import { apiError } from "@/lib/utils";
import { assertSafeStorageKey, readStoredFile, StorageError } from "@/lib/storage";
import { prisma } from "@/lib/db";
import { canEditFinances } from "@/domain/household";

type Ctx = { params: Promise<{ key: string[] }> };

/**
 * Serve private receipt / attachment files for the authenticated family.
 * Keys are stored on Expense.receiptImageUrl / receiptPdfUrl as /api/uploads/...
 *
 * Autorização server-side:
 * - membro da família
 * - despesa PERSONAL: só o próprio membro (ou OWNER/ADMIN)
 * - despesa FAMILY: qualquer membro da família
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

  const membership = await prisma.familyMember.findFirst({
    where: { userId: session.user.id },
  });
  if (!membership) return apiError("Sem família", 403);

  const expense = await prisma.expense.findFirst({
    where: {
      familyId: membership.familyId,
      OR: [{ receiptImageUrl: urlPath }, { receiptPdfUrl: urlPath }],
    },
  });
  if (!expense) return apiError("Ficheiro não encontrado", 404);

  // Isolamento Pessoal / Familiar
  if (expense.scope === "PERSONAL") {
    const isOwnerAdmin = membership.role === "OWNER" || membership.role === "ADMIN";
    const isOwn =
      expense.memberId === membership.id || expense.createdById === session.user.id;
    if (!isOwn && !isOwnerAdmin) {
      return apiError("Sem permissão para ver esta fatura.", 403);
    }
  } else if (!canEditFinances(membership.role) && membership.role !== "VIEWER") {
    return apiError("Sem permissão", 403);
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
    return apiError("Não foi possível ler a fatura.", 500);
  }
}
