import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getActiveFamilyForUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { Panel } from "@/components/ui/FinanceUI";
import { HouseholdManager } from "@/components/nina/HouseholdManager";
import { HouseholdLiveSync } from "@/components/nina/HouseholdLiveSync";
import { formatEUR } from "@/lib/money";
import { HOUSEHOLD_KIND_LABELS } from "@/domain/household";

export default async function FamiliaPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/pt/login");
  const membership = await getActiveFamilyForUser(session.user.id);
  if (!membership) redirect("/pt/registo");

  const [members, recentExpenses, recentIncomes, goals, latestInvite] = await Promise.all([
    prisma.familyMember.findMany({
      where: { familyId: membership.familyId },
      include: { user: { select: { email: true, image: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.expense.findMany({
      where: { familyId: membership.familyId, scope: "FAMILY" },
      include: { member: true, category: true },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    prisma.income.findMany({
      where: { familyId: membership.familyId, scope: "FAMILY" },
      include: { member: true, category: true },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.savingsGoal.findMany({
      where: { familyId: membership.familyId, scope: "FAMILY" },
      orderBy: { createdAt: "asc" },
    }),
    prisma.familyInvite.findFirst({
      where: {
        familyId: membership.familyId,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const activity = [
    ...recentExpenses.map((e) => ({
      id: e.id,
      type: "expense" as const,
      who: e.member?.displayName ?? "Alguém",
      label: e.description,
      category: e.category.name,
      amountCents: e.amountCents,
      at: e.createdAt,
      date: e.date,
      time: e.time,
    })),
    ...recentIncomes.map((i) => ({
      id: i.id,
      type: "income" as const,
      who: i.member?.displayName ?? "Alguém",
      label: i.description,
      category: i.category.name,
      amountCents: i.amountCents,
      at: i.createdAt,
      date: i.date,
      time: null as string | null,
    })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 14);

  const isIndividual = membership.family.kind === "INDIVIDUAL";

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <h1 className="page-title">Conta Familiar</h1>
          <p className="page-sub">
            {isIndividual
              ? "Cria a Conta Familiar com um toque e convida quem quiseres — link ou QR."
              : `${HOUSEHOLD_KIND_LABELS[membership.family.kind]} · ${membership.family.name}. Cada um com o seu perfil; a casa partilhada.`}
          </p>
        </div>
        {!isIndividual ? <HouseholdLiveSync /> : null}
      </div>

      {!isIndividual ? (
        <div className="two-col" style={{ marginBottom: "1rem" }}>
          <Panel title="Atividade familiar">
            <div className="list-rows">
              {activity.map((a) => (
                <div key={`${a.type}-${a.id}`} className="list-row">
                  <div className="list-row-main">
                    <strong>
                      {a.who} · {a.label}
                    </strong>
                    <span>
                      {a.category} · {a.date.toLocaleDateString("pt-PT")}
                      {a.time
                        ? ` ${a.time}`
                        : ` ${a.at.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}`}
                    </span>
                  </div>
                  <span className={a.type === "expense" ? "amount-expense" : "amount-income"}>
                    {a.type === "expense" ? "−" : "+"}
                    {formatEUR(a.amountCents)}
                  </span>
                </div>
              ))}
              {activity.length === 0 ? (
                <p className="muted">Ainda sem movimentos familiares. Diz à Nina o que gastaram em casa.</p>
              ) : null}
            </div>
          </Panel>

          <Panel title="Objetivos de todos">
            {goals.map((g) => {
              const pct =
                g.targetCents > 0
                  ? Math.min(100, Math.round((g.currentCents / g.targetCents) * 1000) / 10)
                  : 0;
              return (
                <div key={g.id} className="goal-card">
                  <div className="goal-head">
                    <strong>{g.name}</strong>
                    <span className="text-income">{pct}%</span>
                  </div>
                  <p className="muted small">
                    {formatEUR(g.currentCents)} de {formatEUR(g.targetCents)} · familiar
                  </p>
                </div>
              );
            })}
            {goals.length === 0 ? (
              <p className="muted">Criem um objetivo juntos — a Nina atualiza o progresso automaticamente.</p>
            ) : null}
          </Panel>
        </div>
      ) : null}

      <HouseholdManager
        familyName={membership.family.name}
        kind={membership.family.kind}
        myRole={membership.role}
        members={members}
        latestInvitePath={latestInvite ? `/pt/convite/${latestInvite.token}` : null}
      />
    </div>
  );
}
