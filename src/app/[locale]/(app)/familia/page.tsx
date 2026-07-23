import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getActiveFamilyForUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { Panel } from "@/components/ui/FinanceUI";
import { MemberForm } from "@/components/finance/Forms";

export default async function FamiliaPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/pt/login");
  const membership = await getActiveFamilyForUser(session.user.id);
  if (!membership) redirect("/pt/registo");

  const members = await prisma.familyMember.findMany({
    where: { familyId: membership.familyId },
    include: { user: { select: { email: true, image: true } } },
  });

  return (
    <div>
      <h1 className="page-title">A tua família</h1>
      <p className="page-sub">
        {membership.family.name} · multiutilizador com permissões e despesas próprias.
      </p>
      <div className="two-col">
        <Panel title="Membros">
          <div className="member-grid">
            {members.map((m) => (
              <div key={m.id} className="member-card">
                <div className="avatar" style={{ background: m.color }}>
                  {m.displayName.slice(0, 1).toUpperCase()}
                </div>
                <strong>{m.displayName}</strong>
                <p className="muted small">{m.user.email}</p>
                <p className="small">{m.role}</p>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Adicionar membro">
          <MemberForm />
        </Panel>
      </div>
    </div>
  );
}
