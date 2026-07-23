import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getActiveFamilyForUser } from "@/lib/session";
import { getDashboardData } from "@/lib/queries";
import { formatEUR } from "@/lib/money";
import {
  StatCard,
  Panel,
  ProgressBar,
  CategoryBars,
  EvolutionChart,
} from "@/components/ui/FinanceUI";
import { PAYMENT_METHOD_LABELS } from "@/domain/categories";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/pt/login");
  const membership = await getActiveFamilyForUser(session.user.id);
  if (!membership) redirect("/pt/registo");

  const data = await getDashboardData(membership.familyId);

  return (
    <div>
      <h1 className="page-title">Olá, {membership.displayName}</h1>
      <p className="page-sub">
        Resumo de {data.monthLabel} · Família {membership.family.name}
      </p>

      <div className="stats-grid">
        <StatCard label="Saldo do mês" valueCents={data.totals.balanceCents} tone="neutral" />
        <StatCard label="Receitas" valueCents={data.totals.incomeCents} tone="income" />
        <StatCard label="Despesas" valueCents={data.totals.expenseCents} tone="expense" />
        <StatCard
          label="Valor poupado"
          valueCents={data.totals.savedCents}
          tone="savings"
          hint={`Orçamento utilizado: ${data.totals.budgetUsedPercent}%`}
        />
      </div>

      <div className="stack-lg">
        <Panel title="Orçamento do mês">
          <ProgressBar
            percent={data.totals.budgetUsedPercent}
            label={`${formatEUR(data.totals.budgetUsedCents)} de ${formatEUR(data.totals.budgetLimitCents || data.totals.incomeCents)}`}
          />
          <div className="stack-lg" style={{ marginTop: "0.75rem" }}>
            {data.budgetRows.slice(0, 4).map((b) => (
              <ProgressBar
                key={b.id}
                percent={b.percent}
                color={b.color}
                label={`${b.name} · ${formatEUR(b.usedCents)} / ${formatEUR(b.limitCents)}`}
              />
            ))}
          </div>
        </Panel>

        <div className="dash-grid">
          <Panel
            title="Despesas por categoria"
            action={
              <Link href="/pt/estatisticas" className="muted small">
                Ver mais
              </Link>
            }
          >
            <CategoryBars items={data.categoryChart.slice(0, 6)} />
          </Panel>
          <Panel title="Evolução mensal">
            <EvolutionChart points={data.evolution} />
            <p className="muted small" style={{ marginTop: "0.75rem" }}>
              Verde = receitas · Vermelho = despesas
            </p>
          </Panel>
        </div>

        <div className="dash-grid">
          <Panel
            title="Últimas despesas"
            action={
              <Link href="/pt/despesas" className="muted small">
                Ver todas
              </Link>
            }
          >
            <div className="list-rows">
              {data.recentExpenses.map((e) => (
                <div key={e.id} className="list-row">
                  <div className="list-row-main">
                    <strong>{e.description}</strong>
                    <span>
                      {e.storeName ? `${e.storeName} · ` : ""}
                      {e.category.name} ·{" "}
                      {e.date.toLocaleDateString("pt-PT")}
                      {e.time ? ` ${e.time}` : ""}
                    </span>
                  </div>
                  <span className="amount-expense">−{formatEUR(e.amountCents)}</span>
                </div>
              ))}
              {data.recentExpenses.length === 0 ? (
                <p className="muted">Ainda sem despesas este mês.</p>
              ) : null}
            </div>
          </Panel>

          <div className="stack-lg">
            <Panel
              title="Objetivos de poupança"
              action={
                <Link href="/pt/objetivos" className="muted small">
                  Gerir
                </Link>
              }
            >
              {data.goals.map((g) => (
                <div key={g.id} className="goal-card">
                  <div className="goal-head">
                    <strong>{g.name}</strong>
                    <span className="text-income">{g.progress}%</span>
                  </div>
                  <ProgressBar percent={g.progress} color="#0f7a4a" />
                  <p className="muted small">
                    {formatEUR(g.currentCents)} de {formatEUR(g.targetCents)}
                  </p>
                </div>
              ))}
            </Panel>

            <Panel title="Próximos pagamentos">
              <div className="list-rows">
                {data.upcomingPayments.map((r) => (
                  <div key={r.id} className="list-row">
                    <div className="list-row-main">
                      <strong>{r.name}</strong>
                      <span>
                        {r.category.name} ·{" "}
                        {r.nextDueDate.toLocaleDateString("pt-PT")} ·{" "}
                        {PAYMENT_METHOD_LABELS[r.paymentMethod]}
                      </span>
                    </div>
                    <span className="amount-expense">{formatEUR(r.amountCents)}</span>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </div>

        {data.insights.length > 0 ? (
          <Panel
            title="Insights IA"
            action={
              <Link href="/pt/ia" className="muted small">
                Assistente
              </Link>
            }
          >
            {data.insights.map((i) => (
              <div key={i.id} className={`insight ${i.severity}`}>
                <h3>{i.title}</h3>
                <p>{i.body}</p>
              </div>
            ))}
          </Panel>
        ) : null}
      </div>
    </div>
  );
}
