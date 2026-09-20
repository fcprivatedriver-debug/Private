import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getActiveFamilyForUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { Panel } from "@/components/ui/FinanceUI";
import { OcrClient } from "@/components/finance/OcrClient";
import { listExpenseCategories } from "@/lib/categories-ensure";

export default async function OcrPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/pt/login");
  const membership = await getActiveFamilyForUser(session.user.id);
  if (!membership) redirect("/pt/registo");

  const [categories, accounts] = await Promise.all([
    listExpenseCategories(membership.familyId),
    prisma.financeAccount.findMany({ where: { familyId: membership.familyId, isActive: true } }),
  ]);

  return (
    <div>
      <h1 className="page-title">Faturas fotografadas</h1>
      <p className="page-sub">
        Fotografa ou carrega a fatura — a MEL analisa automaticamente e prepara a despesa para
        confirmares.
      </p>
      <Panel title="Fotografar e registar">
        <OcrClient categories={categories} accounts={accounts} />
      </Panel>
    </div>
  );
}
