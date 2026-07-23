import { auth } from "@/lib/auth";
import { apiError } from "@/lib/utils";
import { withdrawOffer, DomainError } from "@/domain/marketplace";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Ctx) {
  const session = await auth();
  if (!session?.user || session.user.role !== "DRIVER") {
    return apiError("UNAUTHORIZED", "Login necessário", 401);
  }

  const { id } = await context.params;
  const body = await request.json();

  try {
    if (body.action === "withdraw") {
      const offer = await withdrawOffer(id, session.user.id);
      return Response.json({ offer });
    }
    return apiError("BAD_REQUEST", "Ação desconhecida");
  } catch (error) {
    if (error instanceof DomainError) return apiError(error.code, error.message);
    throw error;
  }
}
