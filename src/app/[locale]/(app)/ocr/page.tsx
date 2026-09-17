import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getActiveFamilyForUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { Panel } from "@/components/ui/FinanceUI";
import { OcrClient } from "@/components/finance/OcrClient";

export default async function OcrPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/pt/login");
  const membership = await getActiveFamilyForUser(session.user.id);
  if (!membership) redirect("/pt/registo");

  const [categories, accounts] = await Promise.all([
    prisma.category.findMany({
      where: { familyId: membership.familyId, kind: "EXPENSE" },
      orderBy: { name: "asc" },
    }),
    prisma.financeAccount.findMany({ where: { familyId: membership.familyId, isActive: true } }),
  ]);

  return (
    <div>
      <h1 className="page-title">Faturas fotografadas</h1>
      <p className="page-sub">
        Fotografa ou carrega a fatura — fica guardada de forma segura. A leitura automática ainda
        não está disponível: introduz loja, data e valor manualmente.
      </p>
      <Panel title="Fotografar e registar">
        <OcrClient categories={categories} accounts={accounts} />
      </Panel>
    </div>
  );
}
