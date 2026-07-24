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
  EmptyState,
} from "@/components/ui/FinanceUI";
import { NinaChat } from "@/components/nina/NinaChat";
import { HouseholdLiveSync } from "@/components/nina/HouseholdLiveSync";
import { SmartSuggestions } from "@/components/nina/SmartSuggestions";
import { HOUSEHOLD_KIND_LABELS } from "@/domain/household";
import { NINA_MISSION_LINE } from "@/lib/ai/mission";
import { isDemoEmail } from "@/lib/demo-mode";

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
  const isEmpty =
    data.totals.incomeCents === 0 &&
    data.totals.expenseCents === 0 &&
    (data.goals?.length ?? 0) === 0;
  const demo = isDemoEmail(session.user.email);

  return (
    <div className="nina-home page-stack">
      <header className="nina-home-intro">
        <div className="page-header-row">
          <div>
            <p className="nina-kicker">
              {label} · {HOUSEHOLD_KIND_LABELS[membership.family.kind]}
              {demo ? " · Demo" : ""}
            </p>
            <h1 className="page-title">Olá, {name}. Eu trato disto por ti.</h1>
            <p className="page-sub">
              {isEmpty
                ? "A tua conta está vazia — como deve ser. Diz-me o primeiro movimento quando quiseres."
                : space === "family"
                  ? "Receitas partilhadas, despesas da casa e objetivos da família — sincronizados."
                  : "Só as tuas receitas, despesas e objetivos pessoais."}
              {` · ${data.monthLabel}`}
            </p>
            <p className="mission-whisper muted small">{NINA_MISSION_LINE}</p>
          </div>
          {space === "family" ? <HouseholdLiveSync /> : null}
        </div>
      </header>

      {!isEmpty ? <SmartSuggestions /> : null}

      <div className="stats-grid nina-glance">
        <StatCard label="Saldo este mês" valueCents={data.totals.balanceCents} tone="neutral" />
        <StatCard label="Receitas" valueCents={data.totals.incomeCents} tone="income" />
        <StatCard label="Despesas" valueCents={data.totals.expenseCents} tone="expense" />
        <StatCard
          label="Poupanças"
          valueCents={data.savingsSummary?.totalSavingsCents ?? data.totals.savedCents}
          tone="savings"
        />
      </div>

      {isEmpty ? (
        <Panel title="Começar com a Nina">
          <EmptyState
            title="Tudo a zeros"
            body="Nenhuma receita, despesa ou objetivo. Adiciona o primeiro movimento — ou fala comigo."
          />
          <div className="btn-row" style={{ marginTop: "1rem", justifyContent: "center" }}>
            <Link href="/pt/receitas/nova" className="btn btn-success">
              Adicionar receita
            </Link>
            <Link href="/pt/despesas/nova" className="btn btn-primary">
              Adicionar despesa
            </Link>
            <Link href="/pt/guia" className="btn btn-ghost">
              Ver Guia
            </Link>
          </div>
        </Panel>
      ) : null}

      <div className="nina-home-grid">
        <Panel title="Fala comigo" className="nina-chat-panel">
          <NinaChat />
        </Panel>

        <div className="stack-lg">
          <Panel title="Onde está a ir o dinheiro">
            {data.categoryChart.length === 0 ? (
              <EmptyState title="Gráficos vazios" body="Quando houver despesas, aparecem aqui." />
            ) : (
              <>
                <CategoryBars items={data.categoryChart.slice(0, 5)} />
                <Link
                  href="/pt/estatisticas"
                  className="muted small"
                  style={{ display: "inline-block", marginTop: "0.75rem" }}
                >
                  Ver resumo completo
                </Link>
              </>
            )}
          </Panel>

          <Panel title={space === "family" ? "Poupanças e objetivos" : "As tuas poupanças"}>
            {(data.goals?.length ?? 0) === 0 ? (
              <EmptyState
                title="Sem objetivos ainda"
                body="Cria o primeiro quando fizer sentido — sem pressa."
              />
            ) : (
              <>
                <p className="muted small" style={{ marginBottom: "0.5rem" }}>
                  {formatEUR(data.savingsSummary?.totalSavingsCents ?? data.totals.savedCents)} em
                  poupanças
                </p>
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
              </>
            )}
            <div className="btn-row" style={{ marginTop: "0.75rem" }}>
              <Link href="/pt/poupancas" className="btn btn-ghost btn-sm">
                Poupanças
              </Link>
              <Link href="/pt/objetivos" className="btn btn-ghost btn-sm">
                Objetivos
              </Link>
            </div>
          </Panel>

          {!isEmpty ? (
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
          ) : null}
        </div>
      </div>
    </div>
  );
}
