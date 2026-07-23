import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getActiveFamilyForUser } from "@/lib/session";
import { getNinaSpace } from "@/actions/household";
import { getStatsData } from "@/lib/queries";
import { formatEUR } from "@/lib/money";
import { spaceLabel } from "@/lib/scope";
import { Panel, CategoryBars, EvolutionChart, ProgressBar } from "@/components/ui/FinanceUI";

export default async function EstatisticasPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/pt/login");
  const membership = await getActiveFamilyForUser(session.user.id);
  if (!membership) redirect("/pt/registo");

  const space = await getNinaSpace();
  const stats = await getStatsData(membership.familyId, {
    space,
    memberId: membership.id,
  });

  return (
    <div>
      <h1 className="page-title">Resumo · {spaceLabel(space)}</h1>
      <p className="page-sub">Uma visão calma do dinheiro neste espaço — sem tabelas confusas.</p>

      <div className="stack-lg">
        <div className="dash-grid">
          <Panel title="Comparação mensal (receitas vs despesas)">
            <EvolutionChart points={stats.evolution} />
          </Panel>
          <Panel title="Despesas por categoria">
            <CategoryBars items={stats.categoryChart} />
          </Panel>
        </div>

        <div className="dash-grid">
          <Panel title="Últimas 4 semanas">
            <CategoryBars
              items={stats.weekly.map((w) => ({
                name: w.label,
                color: "#1e3a5f",
                cents: w.expenseCents,
              }))}
            />
          </Panel>
          <Panel title="Por loja">
            <CategoryBars
              items={stats.byStore.map((s) => ({
                name: s.name,
                color: "#64748b",
                cents: s.cents,
              }))}
            />
          </Panel>
        </div>

        <div className="dash-grid">
          <Panel title="Métodos de pagamento">
            <CategoryBars
              items={stats.byMethod.map((s) => ({
                name: s.name,
                color: "#1e3a5f",
                cents: s.cents,
              }))}
            />
          </Panel>
          <Panel title="Poupança">
            {stats.savingsEvolution.map((g) => (
              <div key={g.name} className="goal-card">
                <div className="goal-head">
                  <strong>{g.name}</strong>
                  <span className="text-income">{g.progress}%</span>
                </div>
                <ProgressBar percent={g.progress} color="#0f7a4a" />
                <p className="muted small">
                  {formatEUR(g.current)} de {formatEUR(g.target)}
                </p>
              </div>
            ))}
          </Panel>
        </div>

        <Panel title="Ano em curso">
          <CategoryBars
            items={stats.annual.map((a) => ({
              name: a.label,
              color: "#1e3a5f",
              cents: a.expenseCents,
            }))}
          />
        </Panel>
      </div>
    </div>
  );
}
