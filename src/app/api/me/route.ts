import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiError } from "@/lib/utils";

export async function GET() {
  const session = await auth();
  if (!session?.user) return apiError("UNAUTHORIZED", "Login necessário", 401);

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      customerProfile: true,
      driverProfile: { include: { vehicles: true } },
    },
  });

  if (!user) return apiError("NOT_FOUND", "Utilizador não encontrado", 404);

  const { passwordHash, ...safe } = user;
  void passwordHash;
  return Response.json({ user: safe });
}
