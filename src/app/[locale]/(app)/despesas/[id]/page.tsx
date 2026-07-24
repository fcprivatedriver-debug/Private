import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getActiveFamilyForUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { ExpenseForm } from "@/components/finance/Forms";
import { Panel } from "@/components/ui/FinanceUI";
import { DeleteTransactionButton } from "@/components/finance/TransactionActions";
import { TransactionAuditPanel } from "@/components/finance/TransactionAuditPanel";
import { canEditTransaction } from "@/domain/household";
import { authorLabel } from "@/lib/transaction-audit";

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
    include: {
      member: true,
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
            {createdByName} · {expense.description}
          </p>
        </div>
        <Link href="/pt/despesas" className="btn btn-ghost">
          Voltar
        </Link>
      </div>

      <Panel title="Histórico">
        <TransactionAuditPanel
          createdBy={createdByName}
          createdAt={expense.createdAt}
          updatedBy={updatedByName}
          updatedAt={expense.updatedAt}
          audits={audits}
        />
      </Panel>

      {canEdit ? (
        <>
          <Panel title="Editar">
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
          </Panel>
          <Panel title="Eliminar">
            <p className="muted small" style={{ marginTop: 0 }}>
              Remove este movimento. Saldo, dashboard e estatísticas atualizam automaticamente.
            </p>
            <DeleteTransactionButton id={expense.id} kind="expense" />
          </Panel>
        </>
      ) : (
        <Panel title="Sem permissão">
          <p className="muted" style={{ marginTop: 0 }}>
            Só podes editar os teus movimentos, a menos que a Conta Familiar permita editar uns dos
            outros.
          </p>
        </Panel>
      )}
    </div>
  );
}
