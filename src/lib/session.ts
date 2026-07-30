import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";

export async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/pt/login");
  }
  return session;
}

export async function requireUser() {
  const session = await requireSession();
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });
  if (!user) redirect("/pt/login");
  return { session, user };
}

export async function getOptionalSession() {
  return auth();
}
