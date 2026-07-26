import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getActiveFamilyForUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { ExpenseForm } from "@/components/finance/Forms";
import { Panel } from "@/components/ui/FinanceUI";
import { TransactionAuditPanel } from "@/components/finance/TransactionAuditPanel";
import { MovementFichaActions } from "@/components/finance/MovementFichaActions";
import { MovementSummary } from "@/components/finance/MovementSummary";
import { canEditTransaction } from "@/domain/household";
import { authorLabel } from "@/lib/transaction-audit";

export default async function FichaDespesaPage({
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
    include: {
      member: true,
      category: true,
      account: true,
      createdBy: { select: { id: true, name: true } },
      updatedBy: { select: { id: true, name: true } },
    },
  });
  if (!expense) notFound();

  const [categories, accounts, members, audits] = await Promise.all([
    prisma.category.findMany({ where: { familyId: membership.familyId }, orderBy: { name: "asc" } }),
    prisma.financeAccount.findMany({ where: { familyId: membership.familyId, isActive: true } }),
    prisma.familyMember.findMany({ where: { familyId: membership.familyId } }),
    prisma.transactionAuditLog.findMany({
      where: { familyId: membership.familyId, kind: "EXPENSE", recordId: id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const canEdit = canEditTransaction({
    role: membership.role,
    userId: session.user.id,
    createdById: expense.createdById,
    allowMembersEditOthers: membership.family.allowMembersEditOthers,
  });
  const showActors = membership.family.kind !== "INDIVIDUAL";

  const createdByName = authorLabel({
    memberDisplayName: expense.member?.displayName,
    createdByName: expense.createdBy?.name,
  });
  const updaterMember = expense.updatedById
    ? members.find((m) => m.userId === expense.updatedById)
    : null;
  const updatedByName = expense.updatedBy
    ? authorLabel({
        memberDisplayName: updaterMember?.displayName,
        createdByName: expense.updatedBy.name,
      })
    : null;

  return (
    <div className="page-stack">
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Ficha da despesa</h1>
          <p className="page-sub">
            {showActors ? `${createdByName} · ` : null}
            Movimento original — editar não cria duplicado.
          </p>
        </div>
        <Link href="/pt/despesas" className="btn btn-ghost">
          Voltar
        </Link>
      </div>

      <Panel title="Movimento">
        <MovementSummary
          kind="expense"
          description={expense.description}
          amountCents={expense.amountCents}
          date={expense.date}
          categoryName={expense.category.name}
          scope={expense.scope}
          accountName={expense.account?.name}
        />
      </Panel>

      <MovementFichaActions id={expense.id} kind="expense" canEdit={canEdit}>
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
            scope: expense.scope,
          }}
        />
      </MovementFichaActions>

      <Panel title="Histórico">
        <TransactionAuditPanel
          createdBy={createdByName}
          createdAt={expense.createdAt}
          updatedBy={updatedByName}
          updatedAt={expense.updatedAt}
          audits={audits}
          showActors={showActors}
        />
      </Panel>
    </div>
  );
}
