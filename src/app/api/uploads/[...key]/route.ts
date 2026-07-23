import { auth } from "@/lib/auth";
import { apiError } from "@/lib/utils";
import { assertSafeStorageKey, readStoredFile } from "@/lib/storage";
import { prisma } from "@/lib/db";

type Ctx = { params: Promise<{ key: string[] }> };

export async function GET(_request: Request, context: Ctx) {
  const session = await auth();
  if (!session?.user) return apiError("UNAUTHORIZED", "Login necessário", 401);

  const { key } = await context.params;
  const storageKey = assertSafeStorageKey(key.join("/"));

  const doc = await prisma.driverDocument.findFirst({
    where: { storageKey },
    include: { driverProfile: true },
  });
  if (!doc) return apiError("NOT_FOUND", "Ficheiro não encontrado", 404);

  const isOwner = doc.driverProfile.userId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";
  if (!isOwner && !isAdmin) return apiError("FORBIDDEN", "Sem permissão", 403);

  const bytes = await readStoredFile(storageKey);
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Length": String(bytes.length),
      "Cache-Control": "private, max-age=60",
    },
  });
}
