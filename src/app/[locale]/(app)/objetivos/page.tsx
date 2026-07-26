import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getActiveFamilyForUser } from "@/lib/session";
import { getSavingsModuleData } from "@/actions/savings";
import { formatEUR } from "@/lib/money";
import { spaceLabel } from "@/lib/scope";
import { daysBetween } from "@/domain/investments";
import { ACCOUNT_KIND_LABELS, GOAL_PRIORITY_LABELS } from "@/domain/investments";
import { Panel, ProgressBar } from "@/components/ui/FinanceUI";
import {
  LifeGoalForm,
  GoalItemForm,
  RemoveGoalItemButton,
  GoalContributeForm,
} from "@/components/finance/SavingsForms";

export default async function ObjetivosPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/pt/login");
  const membership = await getActiveFamilyForUser(session.user.id);
  if (!membership) redirect("/pt/registo");

  const data = await getSavingsModuleData();

  return (
    <div>
      <h1 className="page-title">Objetivos · {spaceLabel(data.space)}</h1>
      <p className="page-sub">
        Divide o sonho em partes, acompanha o progresso e deixa a Nina sugerir o ritmo certo.
      </p>

      <div className="savings-tabs" role="tablist">
        <Link href="/pt/poupancas" className="savings-tab">
          Poupanças
        </Link>
        <Link href="/pt/objetivos" className="savings-tab active">
          Objetivos
        </Link>
        <Link href="/pt/poupancas?tab=simulador" className="savings-tab">
          Simulador
        </Link>
      </div>

      {data.tips.length > 0 ? (
        <Panel title="A Nina está a acompanhar" className="nina-tips-panel">
          <ul className="nina-tips">
            {data.tips.slice(0, 3).map((t) => (
              <li key={t.id} className={`nina-tip tone-${t.tone}`}>
                {t.text}
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      <div className="two-col">
        <Panel title="Progresso">
          {data.goals.map((g) => {
            const daysLeft = g.deadline ? daysBetween(new Date(), g.deadline) : null;
            return (
              <div key={g.id} className="goal-card">
                <div className="goal-head">
                  <div>
                    <strong>{g.name}</strong>
                    <p className="muted small">
                      {GOAL_PRIORITY_LABELS[g.priority] ?? g.priority}
                      {" · "}
                      {ACCOUNT_KIND_LABELS[g.accountKind] ?? g.accountKind}
                      {g.deadline ? ` · até ${g.deadline.toLocaleDateString("pt-PT")}` : ""}
                      {daysLeft != null ? ` · ${daysLeft} dias restantes` : ""}
                    </p>
                  </div>
                  <span className="text-income">{g.progress}%</span>
                </div>
                {g.description ? <p className="muted small">{g.description}</p> : null}
                <ProgressBar percent={g.progress} color="#0f7a4a" />
                <p className="muted small">
                  Reservado {formatEUR(g.currentCents)} de {formatEUR(g.targetCents)} · falta{" "}
                  {formatEUR(g.remainingCents)}
                  {g.isCompleted ? " · concluído" : ""}
                </p>

                {g.items.length > 0 ? (
                  <ul className="goal-items-list">
                    {g.items.map((it) => (
                      <li key={it.id}>
                        <span>{it.name}</span>
                        <span>{formatEUR(it.amountCents)}</span>
                        <RemoveGoalItemButton itemId={it.id} />
                      </li>
                    ))}
                    <li className="goal-items-total">
                      <strong>Total</strong>
                      <strong>{formatEUR(g.itemsTotalCents)}</strong>
                    </li>
                  </ul>
                ) : null}

                <GoalItemForm goalId={g.id} />
                <GoalContributeForm goalId={g.id} />
              </div>
            );
          })}
          {data.goals.length === 0 ? <p className="muted">Ainda sem objetivos neste espaço.</p> : null}
        </Panel>
        <Panel title="Novo objetivo">
          <LifeGoalForm />
        </Panel>
      </div>
    </div>
  );
}
