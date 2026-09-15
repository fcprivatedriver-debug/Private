import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

export async function getActiveFamilyForUser(userId: string) {
  const membership = await prisma.familyMember.findFirst({
    where: { userId },
    include: {
      family: true,
      user: { select: { id: true, name: true, email: true, image: true, theme: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  return membership;
}

export async function requireFamilyContext() {
  const session = await requireSession();
  const membership = await getActiveFamilyForUser(session.user.id);
  if (!membership) {
    throw new Error("NO_FAMILY");
  }
  return { session, membership, family: membership.family };
}
