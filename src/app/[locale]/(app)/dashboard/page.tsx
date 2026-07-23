import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getActiveFamilyForUser } from "@/lib/session";
import { getDashboardData } from "@/lib/queries";
import { getNinaSpace } from "@/actions/household";
import { formatEUR } from "@/lib/money";
import { spaceLabel } from "@/lib/scope";
import {
  StatCard,
  Panel,
  ProgressBar,
  CategoryBars,
} from "@/components/ui/FinanceUI";
import { NinaChat } from "@/components/nina/NinaChat";
import { HouseholdLiveSync } from "@/components/nina/HouseholdLiveSync";
import { SmartSuggestions } from "@/components/nina/SmartSuggestions";
import { HOUSEHOLD_KIND_LABELS } from "@/domain/household";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/pt/login");
  const membership = await getActiveFamilyForUser(session.user.id);
  if (!membership) redirect("/pt/registo");

  const space = await getNinaSpace();
  const data = await getDashboardData(membership.familyId, {
    space,
    memberId: membership.id,
  });
  const name = membership.displayName;
  const label = spaceLabel(space);

  return (
    <div className="nina-home">
      <header className="nina-home-intro">
        <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
          <div>
            <p className="nina-kicker">
              {label} · {HOUSEHOLD_KIND_LABELS[membership.family.kind]}
            </p>
            <h1 className="page-title">Olá, {name}. Eu trato disto por ti.</h1>
            <p className="page-sub">
              {space === "family"
                ? "Receitas partilhadas, despesas da casa e objetivos da família — sincronizados."
                : "Só as tuas receitas, despesas e objetivos pessoais."}
              {` · ${data.monthLabel}`}
            </p>
          </div>
          {space === "family" ? <HouseholdLiveSync /> : null}
        </div>
      </header>

      <SmartSuggestions />

      <div className="stats-grid nina-glance">
        <StatCard label="Folga este mês" valueCents={data.totals.balanceCents} tone="neutral" />
        <StatCard label="Entrou" valueCents={data.totals.incomeCents} tone="income" />
        <StatCard label="Saiu" valueCents={data.totals.expenseCents} tone="expense" />
        <StatCard
          label="A caminho da poupança"
          valueCents={data.totals.savedCents}
          tone="savings"
          hint={
            data.totals.budgetUsedPercent
              ? `Usaste ${data.totals.budgetUsedPercent}% do plano`
              : undefined
          }
        />
      </div>

      <div className="nina-home-grid">
        <Panel title="Fala comigo" className="nina-chat-panel">
          <NinaChat />
        </Panel>

        <div className="stack-lg">
          <Panel title="Onde está a ir o dinheiro">
            <CategoryBars items={data.categoryChart.slice(0, 5)} />
            <Link href="/pt/estatisticas" className="muted small" style={{ display: "inline-block", marginTop: "0.75rem" }}>
              Ver resumo completo
            </Link>
          </Panel>

          <Panel title={space === "family" ? "Objetivos da família" : "Os teus objetivos"}>
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
            <Link href="/pt/objetivos" className="btn btn-ghost btn-sm" style={{ marginTop: "0.5rem" }}>
              Gerir objetivos
            </Link>
          </Panel>

          <Panel title="Avisos amigáveis">
            {data.alerts.length === 0 ? (
              <p className="muted">Tudo calmo por agora. Eu aviso se algo precisar da tua atenção.</p>
            ) : (
              <div className="list-rows">
                {data.alerts.slice(0, 4).map((a) => (
                  <div key={a.id} className="list-row">
                    <div className="list-row-main">
                      <strong>{a.title}</strong>
                      <span>{a.message}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
