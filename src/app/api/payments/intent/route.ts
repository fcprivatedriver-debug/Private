import { auth } from "@/lib/auth";
import { apiError } from "@/lib/utils";

/** Legacy marketplace endpoint — FC Private Driver uses checkout sessions via server actions. */
export async function POST() {
  const session = await auth();
  if (!session?.user || session.user.role !== "CUSTOMER") {
    return apiError("UNAUTHORIZED", "Login necessário", 401);
  }

  return apiError(
    "NOT_AVAILABLE",
    "Use as ações de pagamento no painel do cliente (planos e minutos).",
    410,
  );
}
