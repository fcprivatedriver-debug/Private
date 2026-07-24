import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getActiveFamilyForUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { IncomeForm } from "@/components/finance/Forms";
import { Panel } from "@/components/ui/FinanceUI";

export default async function EditarReceitaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/pt/login");
  const membership = await getActiveFamilyForUser(session.user.id);
  if (!membership) redirect("/pt/registo");

  const { id } = await params;
  const income = await prisma.income.findFirst({
    where: { id, familyId: membership.familyId },
  });
  if (!income) notFound();

  const [categories, accounts, members] = await Promise.all([
    prisma.category.findMany({ where: { familyId: membership.familyId }, orderBy: { name: "asc" } }),
    prisma.financeAccount.findMany({ where: { familyId: membership.familyId, isActive: true } }),
    prisma.familyMember.findMany({ where: { familyId: membership.familyId } }),
  ]);

  return (
    <div className="page-stack">
      <h1 className="page-title">Editar receita</h1>
      <p className="page-sub">Altera o que precisares — o resto atualiza sozinho.</p>
      <Panel title="Detalhes">
        <IncomeForm
          categories={categories}
          accounts={accounts}
          members={members}
          initial={{
            id: income.id,
            amountCents: income.amountCents,
            date: income.date.toISOString().slice(0, 10),
            description: income.description,
            categoryId: income.categoryId,
            accountId: income.accountId,
            memberId: income.memberId,
            notes: income.notes,
          }}
        />
      </Panel>
    </div>
  );
}
