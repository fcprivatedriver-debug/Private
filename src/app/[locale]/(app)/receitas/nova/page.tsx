import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getActiveFamilyForUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { IncomeForm } from "@/components/finance/Forms";
import { Panel } from "@/components/ui/FinanceUI";

export default async function NovaReceitaPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/pt/login");
  const membership = await getActiveFamilyForUser(session.user.id);
  if (!membership) redirect("/pt/registo");

  const [categories, accounts, members] = await Promise.all([
    prisma.category.findMany({ where: { familyId: membership.familyId }, orderBy: { name: "asc" } }),
    prisma.financeAccount.findMany({ where: { familyId: membership.familyId, isActive: true } }),
    prisma.familyMember.findMany({ where: { familyId: membership.familyId } }),
  ]);

  return (
    <div className="page-stack">
      <h1 className="page-title">Adicionar receita</h1>
      <p className="page-sub">
        Salário, subsídio, donativo, reembolso, venda, renda ou outro — tu decides.
      </p>
      <Panel title="Detalhes">
        <IncomeForm categories={categories} accounts={accounts} members={members} />
      </Panel>
    </div>
  );
}
