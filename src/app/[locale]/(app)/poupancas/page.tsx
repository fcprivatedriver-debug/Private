import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getActiveFamilyForUser } from "@/lib/session";
import { getSavingsModuleData } from "@/actions/savings";
import { formatEUR } from "@/lib/money";
import { spaceLabel } from "@/lib/scope";
import { daysBetween } from "@/domain/investments";
import {
  ACCOUNT_KIND_LABELS,
  INVESTMENT_VEHICLE_LABELS,
  CAPITALIZATION_LABELS,
  INTEREST_PERIOD_LABELS,
} from "@/domain/investments";
import { Panel, ProgressBar, StatCard } from "@/components/ui/FinanceUI";
import {
  SavingPotForm,
  PotContributeForm,
  InvestmentForm,
  QuickTransferForm,
  SimulatorForm,
} from "@/components/finance/SavingsForms";

export default async function PoupancasPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/pt/login");
  const membership = await getActiveFamilyForUser(session.user.id);
  if (!membership) redirect("/pt/registo");

  const sp = (await searchParams) || {};
  const tab = sp.tab === "simulador" ? "simulador" : "poupancas";
  const data = await getSavingsModuleData();

  return (
    <div>
      <h1 className="page-title">Poupanças · {spaceLabel(data.space)}</h1>
      <p className="page-sub">
        Transforma pequenas poupanças em objetivos concretos — com investimento e previsões da Nina.
      </p>

      <div className="savings-tabs" role="tablist">
        <Link
          href="/pt/poupancas"
          className={`savings-tab ${tab === "poupancas" ? "active" : ""}`}
        >
          Poupanças
        </Link>
        <Link href="/pt/objetivos" className="savings-tab">
          Objetivos
        </Link>
        <Link
          href="/pt/poupancas?tab=simulador"
          className={`savings-tab ${tab === "simulador" ? "active" : ""}`}
        >
          Simulador
        </Link>
      </div>

      <div className="stats-grid" style={{ marginBottom: "1.25rem" }}>
        <StatCard label="Total das poupanças" valueCents={data.summary.totalSavingsCents} tone="savings" />
        <StatCard label="Total investido" valueCents={data.summary.totalInvestedCents} tone="income" />
        <StatCard
          label="Rentabilidade acumulada"
          valueCents={data.summary.accruedReturnCents}
          tone="neutral"
        />
        <StatCard
          label="Ainda necessário (objetivos)"
          valueCents={data.summary.totalStillNeededCents}
          tone="expense"
        />
      </div>

      {tab === "simulador" ? (
        <div className="two-col">
          <Panel title="Simulações rápidas">
            <p className="muted small" style={{ marginBottom: "0.75rem" }}>
              “Se eu poupar 150 € por mês, quando atinjo?” — a Nina responde na hora.
            </p>
            <SimulatorForm
              targets={[
                ...data.pots.map((p) => ({ id: p.id, name: p.name, kind: "pot" as const })),
                ...data.goals.map((g) => ({ id: g.id, name: g.name, kind: "goal" as const })),
              ]}
            />
          </Panel>
          <Panel title="Transferir por texto">
            <p className="muted small" style={{ marginBottom: "0.75rem" }}>
              Ou diz à Nina: “coloca 100 euros nas férias”.
            </p>
            <QuickTransferForm />
          </Panel>
        </div>
      ) : (
        <div className="two-col">
          <Panel title="As tuas poupanças">
            {data.pots.map((p) => {
              const daysLeft = p.deadline ? daysBetween(new Date(), p.deadline) : null;
              return (
                <div key={p.id} className="goal-card savings-pot-card">
                  <div className="goal-head">
                    <div>
                      <strong>{p.name}</strong>
                      <p className="muted small">
                        {ACCOUNT_KIND_LABELS[p.accountKind] ?? p.accountKind}
                        {p.deadline ? ` · até ${p.deadline.toLocaleDateString("pt-PT")}` : ""}
                        {daysLeft != null ? ` · ${daysLeft} dias` : ""}
                      </p>
                    </div>
                    <span className="text-income">{p.progress}%</span>
                  </div>
                  <ProgressBar percent={p.progress} color="#0f7a4a" />
                  <p className="muted small">
                    {formatEUR(p.currentCents)} de {formatEUR(p.targetCents)}
                    {p.isCompleted ? " · concluída" : ""}
                  </p>
                  {p.notes ? <p className="muted small">{p.notes}</p> : null}
                  <PotContributeForm potId={p.id} />

                  {p.investment ? (
                    <div className="invest-box">
                      <p className="invest-title">
                        {INVESTMENT_VEHICLE_LABELS[p.investmentVehicle] ?? "Investimento"}
                      </p>
                      <ul className="invest-stats">
                        <li>
                          Valor estimado: <strong>{formatEUR(p.investment.estimatedValueCents)}</strong>
                        </li>
                        <li>
                          Juros acumulados: <strong>{formatEUR(p.investment.accruedInterestCents)}</strong>
                        </li>
                        <li>
                          Rentabilidade: <strong>{p.investment.returnPercent}%</strong>
                        </li>
                        <li className="muted small">
                          {p.annualRatePercent}% ·{" "}
                          {CAPITALIZATION_LABELS[p.capitalization ?? ""] ?? ""} ·{" "}
                          {INTEREST_PERIOD_LABELS[p.interestPeriod ?? ""] ?? ""}
                        </li>
                      </ul>
                      <div className="invest-projections">
                        {p.investment.projections.map((proj) => (
                          <span key={proj.label} className="invest-chip">
                            {proj.label}: {formatEUR(proj.valueCents)}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <details className="invest-details">
                      <summary>Marcar como investida</summary>
                      <InvestmentForm potId={p.id} defaultCapital={p.currentCents} />
                    </details>
                  )}
                </div>
              );
            })}
            {data.pots.length === 0 ? (
              <p className="muted">Ainda sem poupanças neste espaço. Cria a primeira à direita.</p>
            ) : null}
          </Panel>
          <div className="stack-lg">
            <Panel title="Nova poupança">
              <SavingPotForm />
            </Panel>
            <Panel title="Transferência rápida">
              <QuickTransferForm />
            </Panel>
            <Panel title="Sugestões da Nina">
              {data.tips.length === 0 ? (
                <p className="muted">Por agora está tudo estável. Continua o bom ritmo.</p>
              ) : (
                <ul className="nina-tips">
                  {data.tips.map((t) => (
                    <li key={t.id} className={`nina-tip tone-${t.tone}`}>
                      {t.text}
                    </li>
                  ))}
                </ul>
              )}
              <Link href="/pt/objetivos" className="btn btn-ghost btn-sm" style={{ marginTop: "0.75rem" }}>
                Ver objetivos
              </Link>
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
}
