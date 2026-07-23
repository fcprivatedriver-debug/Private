import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getActiveFamilyForUser } from "@/lib/session";
import { getDashboardData } from "@/lib/queries";
import { prisma } from "@/lib/db";
import { formatEUR, currentYearMonth } from "@/lib/money";
import { Panel, ProgressBar } from "@/components/ui/FinanceUI";
import { BudgetForm, CategoryForm } from "@/components/finance/Forms";

export default async function OrcamentosPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/pt/login");
  const membership = await getActiveFamilyForUser(session.user.id);
  if (!membership) redirect("/pt/registo");

  const { year, month } = currentYearMonth();
  const data = await getDashboardData(membership.familyId);
  const categories = await prisma.category.findMany({
    where: { familyId: membership.familyId },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <h1 className="page-title">Os teus limites</h1>
      <p className="page-sub">
        A Nina avisa-te com carinho quando estiveres perto do limite (75%, 90% e 100%).
      </p>
      <div className="two-col">
        <Panel title="Estado atual">
          {data.budgetRows.map((b) => (
            <div key={b.id} style={{ marginBottom: "1rem" }}>
              <ProgressBar
                percent={b.percent}
                color={b.color}
                label={`${b.name} · ${formatEUR(b.usedCents)} / ${formatEUR(b.limitCents)}`}
              />
            </div>
          ))}
          {data.budgetRows.length === 0 ? (
            <p className="muted">Defina o primeiro orçamento.</p>
          ) : null}
        </Panel>
        <div className="stack-lg">
          <Panel title="Definir orçamento">
            <BudgetForm categories={categories} year={year} month={month} />
          </Panel>
          <Panel title="Nova categoria">
            <CategoryForm />
          </Panel>
        </div>
      </div>
    </div>
  );
}
