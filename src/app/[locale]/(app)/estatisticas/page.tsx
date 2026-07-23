import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getActiveFamilyForUser } from "@/lib/session";
import { getStatsData } from "@/lib/queries";
import { formatEUR } from "@/lib/money";
import { Panel, CategoryBars, EvolutionChart, ProgressBar } from "@/components/ui/FinanceUI";

export default async function EstatisticasPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/pt/login");
  const membership = await getActiveFamilyForUser(session.user.id);
  if (!membership) redirect("/pt/registo");

  const stats = await getStatsData(membership.familyId);

  return (
    <div>
      <h1 className="page-title">Estatísticas</h1>
      <p className="page-sub">Mensal, semanal, anual · categorias, lojas e métodos de pagamento.</p>

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
          <Panel title="Anual por mês">
            <CategoryBars
              items={stats.annual.map((a) => ({
                name: a.label,
                color: "#2a4a73",
                cents: a.expenseCents,
              }))}
            />
          </Panel>
        </div>

        <div className="dash-grid">
          <Panel title="Despesas por loja">
            <div className="list-rows">
              {stats.byStore.map((s) => (
                <div key={s.name} className="list-row">
                  <strong>{s.name}</strong>
                  <span className="amount-expense">{formatEUR(s.cents)}</span>
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="Métodos de pagamento">
            <CategoryBars
              items={stats.byMethod.map((m) => ({
                name: m.name,
                color: "#475569",
                cents: m.cents,
              }))}
            />
          </Panel>
        </div>

        <Panel title="Evolução da poupança">
          {stats.savingsEvolution.map((g) => (
            <div key={g.name} style={{ marginBottom: "0.85rem" }}>
              <ProgressBar
                percent={g.progress}
                color="#0f7a4a"
                label={`${g.name} · ${formatEUR(g.current)} / ${formatEUR(g.target)}`}
              />
            </div>
          ))}
        </Panel>
      </div>
    </div>
  );
}
