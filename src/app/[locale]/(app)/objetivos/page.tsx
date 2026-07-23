import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getActiveFamilyForUser } from "@/lib/session";
import { getNinaSpace } from "@/actions/household";
import { prisma } from "@/lib/db";
import { formatEUR } from "@/lib/money";
import { goalProgress } from "@/domain/finance";
import { goalScopeWhere, spaceLabel } from "@/lib/scope";
import { Panel, ProgressBar } from "@/components/ui/FinanceUI";
import { GoalForm, ContributeForm } from "@/components/finance/Forms";

export default async function ObjetivosPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/pt/login");
  const membership = await getActiveFamilyForUser(session.user.id);
  if (!membership) redirect("/pt/registo");

  const space = await getNinaSpace();
  const goals = await prisma.savingsGoal.findMany({
    where: { familyId: membership.familyId, ...goalScopeWhere(space, membership.id) },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div>
      <h1 className="page-title">Objetivos · {spaceLabel(space)}</h1>
      <p className="page-sub">
        {space === "family"
          ? "Objetivos da família — todos contribuem, a Nina acompanha."
          : "Os teus objetivos pessoais."}
      </p>
      <div className="two-col">
        <Panel title="Progresso">
          {goals.map((g) => {
            const progress = goalProgress(g.currentCents, g.targetCents);
            return (
              <div key={g.id} className="goal-card">
                <div className="goal-head">
                  <div>
                    <strong>{g.name}</strong>
                    <p className="muted small">
                      {g.type}
                      {g.deadline ? ` · até ${g.deadline.toLocaleDateString("pt-PT")}` : ""}
                    </p>
                  </div>
                  <span className="text-income">{progress}%</span>
                </div>
                <ProgressBar percent={progress} color="#0f7a4a" />
                <p className="muted small">
                  {formatEUR(g.currentCents)} de {formatEUR(g.targetCents)}
                </p>
                <ContributeForm goalId={g.id} />
              </div>
            );
          })}
          {goals.length === 0 ? <p className="muted">Ainda sem objetivos neste espaço.</p> : null}
        </Panel>
        <Panel title="Novo objetivo">
          <GoalForm />
        </Panel>
      </div>
    </div>
  );
}
