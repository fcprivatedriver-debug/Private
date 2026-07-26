import { formatEUR } from "@/lib/money";
import { goalProgress } from "@/domain/finance";
import { daysBetween, monthsToReach, dateAfterMonths } from "@/domain/investments";
import { softenGoalRisk, pickCelebration } from "@/lib/ai/personality";

export type GoalInsightInput = {
  id: string;
  name: string;
  targetCents: number;
  currentCents: number;
  deadline: Date | null;
  isCompleted: boolean;
};

export type FinancePulse = {
  incomeCents: number;
  expenseCents: number;
  budgetLimitCents: number;
  categoryBreakdown: { name: string; cents: number }[];
  prevCategoryBreakdown?: { name: string; cents: number }[];
};

export type ProactiveTip = {
  id: string;
  tone: "warm" | "celebrate" | "careful" | "neutral";
  text: string;
  goalId?: string;
  goalName?: string;
};

export function buildProactiveTips(
  goals: GoalInsightInput[],
  pulse: FinancePulse,
): ProactiveTip[] {
  const tips: ProactiveTip[] = [];
  const balance = pulse.incomeCents - pulse.expenseCents;
  const budgetLeft = Math.max(0, (pulse.budgetLimitCents || pulse.incomeCents) - pulse.expenseCents);
  const active = goals.filter((g) => !g.isCompleted);

  for (const g of active) {
    const left = Math.max(0, g.targetCents - g.currentCents);
    const pct = goalProgress(g.currentCents, g.targetCents);
    if (left <= 0) continue;

    if (g.deadline) {
      const daysLeft = daysBetween(new Date(), g.deadline);
      const monthsLeft = Math.max(1, Math.ceil(daysLeft / 30.44));
      const neededMonthly = Math.ceil(left / monthsLeft);
      const paceMonthly =
        g.currentCents > 0 && daysLeft > 0
          ? Math.round(
              g.currentCents /
                Math.max(
                  1,
                  Math.ceil(
                    (Date.now() - (g.deadline.getTime() - daysLeft * 86400000)) /
                      (30.44 * 86400000),
                  ) || 1,
                ),
            )
          : Math.round(g.currentCents / 3);

      const estimatedPace = Math.max(
        paceMonthly,
        Math.round(g.currentCents / Math.max(1, 6 - monthsLeft)),
      );
      const projected = estimatedPace * monthsLeft;

      if (projected + 5000 < left) {
        const shortfall = left - projected;
        tips.push({
          id: `risk-${g.id}`,
          tone: "careful",
          goalId: g.id,
          goalName: g.name,
          text: softenGoalRisk(g.name, formatEUR(shortfall)),
        });
        const boost = 50_00;
        const fasterMonths = monthsToReach(left, neededMonthly + boost);
        if (fasterMonths != null && fasterMonths < monthsLeft) {
          tips.push({
            id: `boost-${g.id}`,
            tone: "warm",
            goalId: g.id,
            goalName: g.name,
            text: `Se conseguires pôr mais ${formatEUR(boost)} de lado por mês, “${g.name}” chega mais cedo — só se fizer sentido para ti.`,
          });
        }
      } else if (pct >= 40) {
        tips.push({
          id: `pace-${g.id}`,
          tone: "warm",
          goalId: g.id,
          goalName: g.name,
          text: `Para “${g.name}” faltam ${formatEUR(left)}. Com cerca de ${formatEUR(neededMonthly)}/mês chegas a tempo (${g.deadline.toLocaleDateString("pt-PT")}).`,
        });
      }
    }

    if (pct >= 55 && pct < 100 && balance > 10_000) {
      tips.push({
        id: `surplus-${g.id}`,
        tone: "celebrate",
        goalId: g.id,
        goalName: g.name,
        text: `${pickCelebration()} Este mês ainda há folga. Queres transferir um bocadinho para “${g.name}”?`,
      });
    }
  }

  if (budgetLeft >= 3500) {
    const soft = Math.min(budgetLeft, 35_00);
    const focus = [...active].sort(
      (a, b) =>
        b.currentCents / Math.max(1, b.targetCents) -
        a.currentCents / Math.max(1, a.targetCents),
    )[0];
    tips.push({
      id: "budget-side",
      tone: "warm",
      goalId: focus?.id,
      goalName: focus?.name,
      text: focus
        ? `Este mês ainda consegues colocar ${formatEUR(soft)} de lado sem ultrapassar o orçamento — por exemplo para “${focus.name}”.`
        : `Este mês ainda consegues colocar ${formatEUR(soft)} de lado sem ultrapassar o orçamento.`,
    });
  }

  const restaurants = pulse.categoryBreakdown.find((c) =>
    /restaurant|cafe|café|lazer/i.test(c.name),
  );
  const prevRest = pulse.prevCategoryBreakdown?.find((c) =>
    /restaurant|cafe|café|lazer/i.test(c.name),
  );
  if (restaurants && prevRest && restaurants.cents > prevRest.cents * 1.2 && active[0]) {
    tips.push({
      id: "restaurants-risk",
      tone: "careful",
      goalId: active[0].id,
      goalName: active[0].name,
      text: `Os gastos em ${restaurants.name} pesaram um pouco mais este mês (${formatEUR(restaurants.cents)}). Vamos tentar equilibrar nas próximas semanas — o objetivo “${active[0].name}” continua no radar.`,
    });
  }

  const seen = new Set<string>();
  return tips
    .filter((t) => {
      if (seen.has(t.text)) return false;
      seen.add(t.text);
      return true;
    })
    .slice(0, 6);
}

export function simulateMonthlySave(input: {
  remainingCents: number;
  monthlyCents: number;
  from?: Date;
}): { months: number | null; reachDate: Date | null; text: string } {
  const months = monthsToReach(input.remainingCents, input.monthlyCents);
  if (months == null) {
    return {
      months: null,
      reachDate: null,
      text: "Indica um valor mensal positivo e eu calculo contigo.",
    };
  }
  if (months === 0) {
    return {
      months: 0,
      reachDate: input.from ?? new Date(),
      text: `${pickCelebration()} Já atingiste o valor.`,
    };
  }
  const reachDate = dateAfterMonths(input.from ?? new Date(), months);
  return {
    months,
    reachDate,
    text: `A poupar ${formatEUR(input.monthlyCents)} por mês, chegas em cerca de ${months} ${months === 1 ? "mês" : "meses"} (${reachDate.toLocaleDateString("pt-PT")}).`,
  };
}
