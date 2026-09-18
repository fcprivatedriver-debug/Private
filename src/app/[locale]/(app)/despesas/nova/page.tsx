import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getActiveFamilyForUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { ExpenseForm } from "@/components/finance/Forms";
import { getNinaSpace } from "@/actions/household";
import { resolveFamilyReceiptAttachment } from "@/lib/receipts";

export default async function NovaDespesaPage({
  searchParams,
}: {
  searchParams: Promise<{ receipt?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/pt/login");
  const membership = await getActiveFamilyForUser(session.user.id);
  if (!membership) redirect("/pt/registo");

  const sp = await searchParams;
  const attachedReceipt = sp.receipt
    ? await resolveFamilyReceiptAttachment(membership.familyId, sp.receipt)
    : null;

  const [categories, accounts, members, space] = await Promise.all([
    prisma.category.findMany({ where: { familyId: membership.familyId }, orderBy: { name: "asc" } }),
    prisma.financeAccount.findMany({ where: { familyId: membership.familyId, isActive: true } }),
    prisma.familyMember.findMany({ where: { familyId: membership.familyId } }),
    getNinaSpace(),
  ]);

  return (
    <div className="page-stack nova-despesa-page">
      <h1 className="page-title">Nova despesa</h1>
      {attachedReceipt ? (
        <p className="muted small" style={{ marginTop: 0 }}>
          Fatura já fotografada — confirma o valor e guarda. A leitura automática ainda não está
          disponível.
        </p>
      ) : null}
      <ExpenseForm
        categories={categories}
        accounts={accounts}
        members={members}
        space={space}
        attachedReceipt={attachedReceipt ?? undefined}
      />
    </div>
  );
}
