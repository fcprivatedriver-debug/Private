import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getActiveFamilyForUser } from "@/lib/session";
import { getDashboardData } from "@/lib/queries";
import { getNinaSpace } from "@/actions/household";
import { formatEUR } from "@/lib/money";
import { spaceLabel } from "@/lib/scope";
import { EmptyState, EvolutionChart } from "@/components/ui/FinanceUI";
import { HouseholdLiveSync } from "@/components/nina/HouseholdLiveSync";
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
  const name = membership.displayName.split(" ")[0];
  const label = spaceLabel(space);
  const isEmpty =
    data.totals.incomeCents === 0 &&
    data.totals.expenseCents === 0 &&
    (data.goals?.length ?? 0) === 0;
  const demo = isDemoEmail(session.user.email);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Olá" : hour < 19 ? "Olá" : "Olá";

  return (
    <div className="hoje page-stack">
      <header className="hoje-header">
        <div className="hoje-hello">
          <p className="hoje-kicker">
            {label}
            {demo ? " · Demo" : ""}
          </p>
          <h1 className="page-title hoje-title">
            {greeting}, {name}
          </h1>
        </div>
        {space === "family" ? <HouseholdLiveSync /> : null}
      </header>

      <section className="hoje-balance" aria-label="Saldo disponível">
        <p className="hoje-balance-label">Disponível este mês</p>
        <p className="hoje-balance-value">{formatEUR(data.totals.balanceCents)}</p>
        <p className="hoje-balance-hint muted small">{data.monthLabel}</p>
      </section>

      {!isEmpty ? (
        <section className="hoje-summary" aria-label="Resumo">
          <div className="hoje-summary-item">
            <span className="hoje-summary-label">Entradas</span>
            <strong className="text-income">{formatEUR(data.totals.incomeCents)}</strong>
          </div>
          <div className="hoje-summary-item">
            <span className="hoje-summary-label">Despesas</span>
            <strong className="text-expense">{formatEUR(data.totals.expenseCents)}</strong>
          </div>
          <div className="hoje-summary-item">
            <span className="hoje-summary-label">Poupança</span>
            <strong className="text-income">
              {formatEUR(data.savingsSummary?.totalSavingsCents ?? data.totals.savedCents)}
            </strong>
          </div>
        </section>
      ) : null}

      {isEmpty ? (
        <section className="hoje-empty">
          <EmptyState
            title="Tudo a zeros"
            body="Regista a primeira despesa ou fala com a MEL."
          />
          <div className="btn-row" style={{ marginTop: "0.75rem" }}>
            <Link href="/pt/despesas/nova" className="btn btn-primary btn-sm">
              Nova despesa
            </Link>
            <Link href="/pt/captura?mode=voice&auto=1" className="btn btn-ghost btn-sm">
              Falar
            </Link>
          </div>
        </section>
      ) : null}

      {!isEmpty && data.evolution?.some((p) => p.incomeCents > 0 || p.expenseCents > 0) ? (
        <section className="hoje-chart" aria-label="Entradas vs despesas">
          <div className="hoje-section-head">
            <h2>Entradas vs despesas</h2>
          </div>
          <EvolutionChart points={data.evolution} />
        </section>
      ) : null}

      <section className="hoje-moves" aria-label="Últimos movimentos">
        <div className="hoje-section-head">
          <h2>Últimos movimentos</h2>
          <Link href="/pt/transacoes" className="muted small">
            Ver tudo
          </Link>
        </div>
        {data.recentExpenses.length === 0 ? (
          <p className="muted small">Ainda sem movimentos este mês.</p>
        ) : (
          <ul className="hoje-move-list">
            {data.recentExpenses.slice(0, 6).map((e) => (
              <li key={e.id}>
                <Link href={`/pt/despesas/${e.id}`} className="hoje-move-row">
                  <div className="hoje-move-main">
                    <strong>{e.description || e.storeName || e.category.name}</strong>
                    <span className="muted small">
                      {e.category.name}
                      {e.storeName ? ` · ${e.storeName}` : ""}
                    </span>
                  </div>
                  <strong className="text-expense">{formatEUR(e.amountCents)}</strong>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
