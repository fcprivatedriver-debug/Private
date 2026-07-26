import { prisma } from "@/lib/db";

/** Transfere valor para poupança ou objetivo (match por nome/hint). */
export async function applySavingsTransfer(
  familyId: string,
  amountCents: number,
  hint?: string,
): Promise<{ ok: true; targetName: string; kind: "pot" | "goal" } | { ok: false; error: string }> {
  if (amountCents <= 0) return { ok: false, error: "Valor inválido" };

  const [pots, goals] = await Promise.all([
    prisma.savingPot.findMany({
      where: { familyId, isCompleted: false },
      orderBy: { createdAt: "asc" },
    }),
    prisma.savingsGoal.findMany({
      where: { familyId, isCompleted: false },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const h = (hint || "").toLowerCase();
  const matchName = <T extends { name: string }>(list: T[]) => {
    if (!h) return undefined;
    return (
      list.find((x) => x.name.toLowerCase().includes(h.slice(0, 8))) ||
      list.find((x) => h.includes(x.name.toLowerCase().slice(0, 5)))
    );
  };

  const pot =
    matchName(pots) ||
    (/(ferias|viagem|algarve)/.test(h) ? pots.find((p) => /ferias|viagem|algarve/i.test(p.name)) : undefined) ||
    (/(carro)/.test(h) ? pots.find((p) => /carro/i.test(p.name)) : undefined) ||
    (/(emergencia|fundo)/.test(h) ? pots.find((p) => /emerg|fundo/i.test(p.name)) : undefined) ||
    (/(casa|entrada)/.test(h) ? pots.find((p) => /casa|entrada/i.test(p.name)) : undefined);

  if (pot) {
    const next = pot.currentCents + amountCents;
    const invested =
      pot.isInvested && pot.investedCapitalCents != null
        ? pot.investedCapitalCents + amountCents
        : pot.investedCapitalCents;
    await prisma.savingPot.update({
      where: { id: pot.id },
      data: {
        currentCents: next,
        investedCapitalCents: invested,
        isCompleted: next >= pot.targetCents,
      },
    });
    if (pot.linkedGoalId) {
      const linked = await prisma.savingsGoal.findFirst({ where: { id: pot.linkedGoalId } });
      if (linked) {
        const gNext = linked.currentCents + amountCents;
        await prisma.savingsGoal.update({
          where: { id: linked.id },
          data: { currentCents: gNext, isCompleted: gNext >= linked.targetCents },
        });
      }
    }
    return { ok: true, targetName: pot.name, kind: "pot" };
  }

  const goal =
    matchName(goals) ||
    (/(ferias|viagem|algarve)/.test(h) ? goals.find((g) => /ferias|viagem|algarve/i.test(g.name)) : undefined) ||
    (/(carro)/.test(h) ? goals.find((g) => /carro/i.test(g.name)) : undefined) ||
    (/(emergencia|fundo)/.test(h) ? goals.find((g) => /emerg|fundo/i.test(g.name)) : undefined) ||
    (/(casa|entrada)/.test(h) ? goals.find((g) => /casa|entrada/i.test(g.name)) : undefined) ||
    goals[0];

  if (goal) {
    const next = goal.currentCents + amountCents;
    await prisma.savingsGoal.update({
      where: { id: goal.id },
      data: { currentCents: next, isCompleted: next >= goal.targetCents },
    });
    return { ok: true, targetName: goal.name, kind: "goal" };
  }

  if (pots[0]) {
    const p = pots[0];
    const next = p.currentCents + amountCents;
    await prisma.savingPot.update({
      where: { id: p.id },
      data: { currentCents: next, isCompleted: next >= p.targetCents },
    });
    return { ok: true, targetName: p.name, kind: "pot" };
  }

  return { ok: false, error: "Não encontrei poupança nem objetivo" };
}
