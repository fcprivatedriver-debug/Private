import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getActiveFamilyForUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { formatEUR } from "@/lib/money";
import { goalProgress } from "@/domain/finance";
import { Panel, ProgressBar } from "@/components/ui/FinanceUI";
import { GoalForm, ContributeForm } from "@/components/finance/Forms";

export default async function ObjetivosPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/pt/login");
  const membership = await getActiveFamilyForUser(session.user.id);
  if (!membership) redirect("/pt/registo");

  const goals = await prisma.savingsGoal.findMany({
    where: { familyId: membership.familyId },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div>
      <h1 className="page-title">Objetivos de poupança</h1>
      <p className="page-sub">Carro, casa, férias, emergência, investimentos, reforma…</p>
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
                      {g.deadline
                        ? ` · até ${g.deadline.toLocaleDateString("pt-PT")}`
                        : ""}
                    </p>
                  </div>
                  <span className="text-income">{progress}%</span>
                </div>
                <ProgressBar percent={progress} color="#0f7a4a" />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.5rem" }}>
                  <span className="small">
                    {formatEUR(g.currentCents)} / {formatEUR(g.targetCents)}
                  </span>
                  <ContributeForm goalId={g.id} />
                </div>
              </div>
            );
          })}
        </Panel>
        <Panel title="Novo objetivo">
          <GoalForm />
        </Panel>
      </div>
    </div>
  );
}
