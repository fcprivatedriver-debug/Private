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
      <h1 className="page-title">OCR de faturas</h1>
      <p className="page-sub">
        Reconhece automaticamente loja, data, valor, IVA, produtos e categoria sugerida.
      </p>
      <Panel title="Fotografar e confirmar">
        <OcrClient categories={categories} accounts={accounts} />
      </Panel>
    </div>
  );
}
