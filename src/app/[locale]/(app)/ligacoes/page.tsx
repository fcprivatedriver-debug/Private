import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getActiveFamilyForUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { ConnectionsCenter } from "@/components/nina/ConnectionsCenter";

export default async function LigacoesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/pt/login");
  const membership = await getActiveFamilyForUser(session.user.id);
  if (!membership) redirect("/pt/registo");

  const [connections, user] = await Promise.all([
    prisma.ninaConnection.findMany({
      where: { familyId: membership.familyId },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.user.findUniqueOrThrow({
      where: { id: session.user.id },
      select: { automationLevel: true },
    }),
  ]);

  return (
    <div>
      <h1 className="page-title">Ligações da Nina</h1>
      <p className="page-sub">
        Escolhe o teu nível de automatização. Cada ligação é opcional, independente e só ativa com a
        tua autorização.
      </p>
      <ConnectionsCenter connections={connections} automationLevel={user.automationLevel} />
    </div>
  );
}
