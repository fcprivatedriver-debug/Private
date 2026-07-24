import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getActiveFamilyForUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { ExpenseForm } from "@/components/finance/Forms";
import { Panel } from "@/components/ui/FinanceUI";

export default async function EditarDespesaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/pt/login");
  const membership = await getActiveFamilyForUser(session.user.id);
  if (!membership) redirect("/pt/registo");

  const { id } = await params;
  const expense = await prisma.expense.findFirst({
    where: { id, familyId: membership.familyId },
  });
  if (!expense) notFound();

  const [categories, accounts, members] = await Promise.all([
    prisma.category.findMany({ where: { familyId: membership.familyId }, orderBy: { name: "asc" } }),
    prisma.financeAccount.findMany({ where: { familyId: membership.familyId, isActive: true } }),
    prisma.familyMember.findMany({ where: { familyId: membership.familyId } }),
  ]);

  return (
    <div className="page-stack">
      <h1 className="page-title">Editar despesa</h1>
      <p className="page-sub">Categoria, conta, valor, data — tudo editável.</p>
      <Panel title="Detalhes">
        <ExpenseForm
          categories={categories}
          accounts={accounts}
          members={members}
          initial={{
            id: expense.id,
            amountCents: expense.amountCents,
            date: expense.date.toISOString().slice(0, 10),
            time: expense.time,
            description: expense.description,
            categoryId: expense.categoryId,
            subcategoryId: expense.subcategoryId,
            storeName: expense.storeName,
            paymentMethod: expense.paymentMethod,
            accountId: expense.accountId,
            memberId: expense.memberId,
            notes: expense.notes,
            receiptImageUrl: expense.receiptImageUrl,
            receiptPdfUrl: expense.receiptPdfUrl,
          }}
        />
      </Panel>
    </div>
  );
}
