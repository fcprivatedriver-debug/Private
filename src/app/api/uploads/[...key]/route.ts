import { auth } from "@/lib/auth";
import { apiError } from "@/lib/utils";
import { assertSafeStorageKey, readStoredFile } from "@/lib/storage";
import { prisma } from "@/lib/db";

type Ctx = { params: Promise<{ key: string[] }> };

/**
 * Serve private receipt / attachment files for the authenticated family.
 * Keys are stored on Expense.receiptImageUrl / receiptPdfUrl as /api/uploads/...
 */
export async function GET(_request: Request, context: Ctx) {
  const session = await auth();
  if (!session?.user) return apiError("Login necessário", 401);

  const { key } = await context.params;
  const storageKey = assertSafeStorageKey(key.join("/"));
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

  const bytes = await readStoredFile(storageKey);
  const mime = storageKey.endsWith(".pdf") ? "application/pdf" : "image/jpeg";
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": mime,
      "Content-Length": String(bytes.length),
      "Cache-Control": "private, max-age=60",
    },
  });
}
