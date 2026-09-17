import { auth } from "@/lib/auth";
import { apiError } from "@/lib/utils";
import { assertSafeStorageKey, readStoredFile, StorageError } from "@/lib/storage";
import { prisma } from "@/lib/db";
import { getActiveFamilyForUser } from "@/lib/session";

type Ctx = { params: Promise<{ key: string[] }> };

/**
 * Serve private receipt / attachment files for the authenticated family.
 * Keys are stored on Expense.receiptImageUrl / receiptPdfUrl as /api/uploads/...
 *
 * Autorização server-side:
 * - membro da família correcta
 * - despesa PERSONAL: só o próprio membro (nunca outro, mesmo OWNER)
 * - despesa FAMILY: qualquer membro da família
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

  const expense = await prisma.expense.findFirst({
    where: {
      familyId: membership.familyId,
      OR: [{ receiptImageUrl: urlPath }, { receiptPdfUrl: urlPath }],
    },
  });
  if (!expense) return apiError("Ficheiro não encontrado", 404);

  if (expense.scope === "PERSONAL") {
    const isOwn =
      expense.memberId === membership.id || expense.createdById === session.user.id;
    if (!isOwn) {
      return apiError("Sem permissão para ver esta fatura.", 403);
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
    return apiError("Não foi possível ler a fatura.", 500);
  }
}
