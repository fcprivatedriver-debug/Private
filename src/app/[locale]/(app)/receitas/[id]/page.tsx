import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getActiveFamilyForUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { IncomeForm } from "@/components/finance/Forms";
import { Panel } from "@/components/ui/FinanceUI";
import { DeleteTransactionButton } from "@/components/finance/TransactionActions";
import { TransactionAuditPanel } from "@/components/finance/TransactionAuditPanel";
import { canEditTransaction } from "@/domain/household";
import { authorLabel } from "@/lib/transaction-audit";

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
    include: {
      member: true,
      createdBy: { select: { id: true, name: true } },
      updatedBy: { select: { id: true, name: true } },
    },
  });
  if (!income) notFound();

  const [categories, accounts, members, audits] = await Promise.all([
    prisma.category.findMany({ where: { familyId: membership.familyId }, orderBy: { name: "asc" } }),
    prisma.financeAccount.findMany({ where: { familyId: membership.familyId, isActive: true } }),
    prisma.familyMember.findMany({ where: { familyId: membership.familyId } }),
    prisma.transactionAuditLog.findMany({
      where: { familyId: membership.familyId, kind: "INCOME", recordId: id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const canEdit = canEditTransaction({
    role: membership.role,
    userId: session.user.id,
    createdById: income.createdById,
    allowMembersEditOthers: membership.family.allowMembersEditOthers,
  });

  const createdByName = authorLabel({
    memberDisplayName: income.member?.displayName,
    createdByName: income.createdBy?.name,
  });
  const updaterMember = income.updatedById
    ? members.find((m) => m.userId === income.updatedById)
    : null;
  const updatedByName = income.updatedBy
    ? authorLabel({
        memberDisplayName: updaterMember?.displayName,
        createdByName: income.updatedBy.name,
      })
    : null;

  return (
    <div className="page-stack">
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Ficha da receita</h1>
          <p className="page-sub">
            {createdByName} · {income.description}
          </p>
        </div>
        <Link href="/pt/receitas" className="btn btn-ghost">
          Voltar
        </Link>
      </div>

      <Panel title="Histórico">
        <TransactionAuditPanel
          createdBy={createdByName}
          createdAt={income.createdAt}
          updatedBy={updatedByName}
          updatedAt={income.updatedAt}
          audits={audits}
        />
      </Panel>

      {canEdit ? (
        <>
          <Panel title="Editar">
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
                scope: income.scope,
              }}
            />
          </Panel>
          <Panel title="Eliminar">
            <p className="muted small" style={{ marginTop: 0 }}>
              Remove este movimento. Saldo, dashboard e estatísticas atualizam automaticamente.
            </p>
            <DeleteTransactionButton id={income.id} kind="income" />
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
