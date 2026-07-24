"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireFamilyContext } from "@/lib/session";
import { parseEURInput } from "@/lib/money";
import {
  savingPotSchema,
  investmentSchema,
  goalSchema,
  goalItemSchema,
} from "@/lib/validators";
import { getNinaSpace } from "@/actions/household";
import { computeInvestmentSnapshot } from "@/domain/investments";
import { buildProactiveTips, simulateMonthlySave, type FinancePulse } from "@/domain/savings-insights";
import { goalProgress } from "@/domain/finance";
import { potScopeWhere, goalScopeWhere } from "@/lib/scope";
import { applySavingsTransfer } from "@/lib/savings-transfer";
import type { AccountKind, GoalPriority, GoalType } from "@prisma/client";

function revalidateApp() {
  revalidatePath("/", "layout");
}

async function scopeFromSpace() {
  const space = await getNinaSpace();
  const scope = space === "family" ? ("FAMILY" as const) : ("PERSONAL" as const);
  return { space, scope };
}

export async function createSavingPot(formData: FormData) {
  const { family, membership } = await requireFamilyContext();
  const parsed = savingPotSchema.safeParse({
    name: formData.get("name"),
    kind: formData.get("kind") || "CUSTOM",
    target: formData.get("target"),
    current: formData.get("current") || "0",
    deadline: formData.get("deadline") || null,
    notes: formData.get("notes") || null,
    accountKind: formData.get("accountKind") || "PERSONAL",
  });
  if (!parsed.success) return { ok: false as const, error: "Dados inválidos" };
  const targetCents = parseEURInput(parsed.data.target);
  const currentCents = parseEURInput(parsed.data.current || "0") ?? 0;
  if (targetCents == null || targetCents <= 0) return { ok: false as const, error: "Objetivo inválido" };

  const { scope } = await scopeFromSpace();
  await prisma.savingPot.create({
    data: {
      familyId: family.id,
      ownerMemberId: scope === "PERSONAL" ? membership.id : null,
      scope,
      accountKind: (parsed.data.accountKind || "PERSONAL") as AccountKind,
      name: parsed.data.name,
      kind: parsed.data.kind as GoalType,
      targetCents,
      currentCents,
      deadline: parsed.data.deadline ? new Date(parsed.data.deadline) : null,
      notes: parsed.data.notes || null,
      isCompleted: currentCents >= targetCents,
    },
  });
  revalidateApp();
  return { ok: true as const };
}

export async function contributeToPot(potId: string, amountRaw: string) {
  const { family } = await requireFamilyContext();
  const cents = parseEURInput(amountRaw);
  if (cents == null || cents === 0) return { ok: false as const, error: "Valor inválido" };
  const pot = await prisma.savingPot.findFirst({ where: { id: potId, familyId: family.id } });
  if (!pot) return { ok: false as const, error: "Poupança não encontrada" };

  const currentCents = Math.max(0, pot.currentCents + cents);
  const investedCapitalCents =
    pot.isInvested && pot.investedCapitalCents != null
      ? Math.max(0, pot.investedCapitalCents + cents)
      : pot.investedCapitalCents;

  await prisma.savingPot.update({
    where: { id: potId },
    data: {
      currentCents,
      investedCapitalCents,
      isCompleted: currentCents >= pot.targetCents,
    },
  });

  if (pot.linkedGoalId) {
    const goal = await prisma.savingsGoal.findFirst({
      where: { id: pot.linkedGoalId, familyId: family.id },
    });
    if (goal) {
      const gCurrent = Math.max(0, goal.currentCents + cents);
      await prisma.savingsGoal.update({
        where: { id: goal.id },
        data: { currentCents: gCurrent, isCompleted: gCurrent >= goal.targetCents },
      });
    }
  }

  revalidateApp();
  return { ok: true as const };
}

export async function setPotInvestment(formData: FormData) {
  const { family } = await requireFamilyContext();
  const parsed = investmentSchema.safeParse({
    potId: formData.get("potId"),
    investmentVehicle: formData.get("investmentVehicle"),
    investedCapital: formData.get("investedCapital"),
    annualRatePercent: formData.get("annualRatePercent"),
    capitalization: formData.get("capitalization") || "COMPOUND",
    interestPeriod: formData.get("interestPeriod") || "YEARLY",
    investmentStartDate: formData.get("investmentStartDate"),
  });
  if (!parsed.success) return { ok: false as const, error: "Dados de investimento inválidos" };

  const pot = await prisma.savingPot.findFirst({
    where: { id: parsed.data.potId, familyId: family.id },
  });
  if (!pot) return { ok: false as const, error: "Poupança não encontrada" };

  const investedCapitalCents = parseEURInput(parsed.data.investedCapital);
  if (investedCapitalCents == null || investedCapitalCents < 0) {
    return { ok: false as const, error: "Capital inválido" };
  }

  await prisma.savingPot.update({
    where: { id: pot.id },
    data: {
      isInvested: true,
      investmentVehicle: parsed.data.investmentVehicle,
      investedCapitalCents,
      currentCents: Math.max(pot.currentCents, investedCapitalCents),
      annualRatePercent: parsed.data.annualRatePercent,
      capitalization: parsed.data.capitalization,
      interestPeriod: parsed.data.interestPeriod,
      investmentStartDate: new Date(parsed.data.investmentStartDate),
    },
  });
  revalidateApp();
  return { ok: true as const };
}

export async function clearPotInvestment(potId: string) {
  const { family } = await requireFamilyContext();
  const pot = await prisma.savingPot.findFirst({ where: { id: potId, familyId: family.id } });
  if (!pot) return { ok: false as const, error: "Poupança não encontrada" };
  await prisma.savingPot.update({
    where: { id: potId },
    data: {
      isInvested: false,
      investmentVehicle: "NONE",
      investedCapitalCents: null,
      annualRatePercent: null,
      capitalization: null,
      interestPeriod: null,
      investmentStartDate: null,
    },
  });
  revalidateApp();
  return { ok: true as const };
}

export async function createLifeGoal(formData: FormData) {
  const { family, membership } = await requireFamilyContext();
  const parsed = goalSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type") || "CUSTOM",
    target: formData.get("target") || "0",
    current: formData.get("current") || "0",
    deadline: formData.get("deadline") || null,
    notes: formData.get("notes") || null,
    description: formData.get("description") || null,
    priority: formData.get("priority") || "MEDIUM",
    accountKind: formData.get("accountKind") || "PERSONAL",
  });
  if (!parsed.success) return { ok: false as const, error: "Dados inválidos" };

  const currentCents = parseEURInput(parsed.data.current || "0") ?? 0;
  let targetCents = parseEURInput(parsed.data.target) ?? 0;

  // Optional items from JSON array in form
  const itemsRaw = String(formData.get("itemsJson") || "").trim();
  let items: { name: string; amountCents: number }[] = [];
  if (itemsRaw) {
    try {
      const arr = JSON.parse(itemsRaw) as { name: string; amount: string }[];
      items = arr
        .map((it) => ({
          name: String(it.name || "").trim(),
          amountCents: parseEURInput(String(it.amount || "")) ?? 0,
        }))
        .filter((it) => it.name && it.amountCents > 0);
      if (items.length) {
        targetCents = items.reduce((s, it) => s + it.amountCents, 0);
      }
    } catch {
      return { ok: false as const, error: "Itens inválidos" };
    }
  }
  if (targetCents <= 0) return { ok: false as const, error: "Valor necessário inválido" };

  const { scope } = await scopeFromSpace();
  const goal = await prisma.savingsGoal.create({
    data: {
      familyId: family.id,
      ownerMemberId: scope === "PERSONAL" ? membership.id : null,
      scope,
      accountKind: (parsed.data.accountKind || "PERSONAL") as AccountKind,
      name: parsed.data.name,
      description: parsed.data.description || null,
      type: parsed.data.type,
      priority: (parsed.data.priority || "MEDIUM") as GoalPriority,
      targetCents,
      currentCents,
      deadline: parsed.data.deadline ? new Date(parsed.data.deadline) : null,
      notes: parsed.data.notes || null,
      isCompleted: currentCents >= targetCents,
      items: items.length
        ? {
            create: items.map((it, i) => ({
              name: it.name,
              amountCents: it.amountCents,
              sortOrder: i,
            })),
          }
        : undefined,
    },
  });
  revalidateApp();
  return { ok: true as const, goalId: goal.id };
}

export async function addGoalItem(formData: FormData) {
  const { family } = await requireFamilyContext();
  const parsed = goalItemSchema.safeParse({
    goalId: formData.get("goalId"),
    name: formData.get("name"),
    amount: formData.get("amount"),
  });
  if (!parsed.success) return { ok: false as const, error: "Dados inválidos" };
  const amountCents = parseEURInput(parsed.data.amount);
  if (amountCents == null || amountCents <= 0) return { ok: false as const, error: "Valor inválido" };

  const goal = await prisma.savingsGoal.findFirst({
    where: { id: parsed.data.goalId, familyId: family.id },
    include: { items: true },
  });
  if (!goal) return { ok: false as const, error: "Objetivo não encontrado" };

  await prisma.goalItem.create({
    data: {
      goalId: goal.id,
      name: parsed.data.name,
      amountCents,
      sortOrder: goal.items.length,
    },
  });

  const targetCents = goal.items.reduce((s, it) => s + it.amountCents, 0) + amountCents;
  await prisma.savingsGoal.update({
    where: { id: goal.id },
    data: {
      targetCents,
      isCompleted: goal.currentCents >= targetCents,
    },
  });
  revalidateApp();
  return { ok: true as const };
}

export async function removeGoalItem(itemId: string) {
  const { family } = await requireFamilyContext();
  const item = await prisma.goalItem.findFirst({
    where: { id: itemId, goal: { familyId: family.id } },
    include: { goal: { include: { items: true } } },
  });
  if (!item) return { ok: false as const, error: "Item não encontrado" };

  await prisma.goalItem.delete({ where: { id: itemId } });
  const remaining = item.goal.items.filter((i) => i.id !== itemId);
  const targetCents =
    remaining.length > 0
      ? remaining.reduce((s, it) => s + it.amountCents, 0)
      : item.goal.targetCents;
  await prisma.savingsGoal.update({
    where: { id: item.goalId },
    data: {
      targetCents,
      isCompleted: item.goal.currentCents >= targetCents,
    },
  });
  revalidateApp();
  return { ok: true as const };
}

export async function transferToSavings(hint: string, amountRaw: string) {
  const { family } = await requireFamilyContext();
  const cents = parseEURInput(amountRaw);
  if (cents == null || cents <= 0) return { ok: false as const, error: "Valor inválido" };
  const result = await applySavingsTransfer(family.id, cents, hint);
  revalidateApp();
  return result;
}

export async function runSavingsSimulation(input: {
  targetId: string;
  targetKind: "pot" | "goal";
  monthlyEuros?: string;
  withdrawEuros?: string;
}) {
  const { family } = await requireFamilyContext();

  const entity =
    input.targetKind === "pot"
      ? await prisma.savingPot.findFirst({ where: { id: input.targetId, familyId: family.id } })
      : await prisma.savingsGoal.findFirst({ where: { id: input.targetId, familyId: family.id } });

  if (!entity) return { ok: false as const, error: "Alvo não encontrado" };

  const remaining = Math.max(0, entity.targetCents - entity.currentCents);
  const lines: string[] = [];

  if (input.monthlyEuros) {
    const monthly = parseEURInput(input.monthlyEuros);
    if (monthly != null && monthly > 0) {
      const sim = simulateMonthlySave({ remainingCents: remaining, monthlyCents: monthly });
      lines.push(sim.text);
      const alt = monthly + 50_00;
      const sim2 = simulateMonthlySave({ remainingCents: remaining, monthlyCents: alt });
      lines.push(`Se aumentares para ${(alt / 100).toFixed(0)} €/mês: ${sim2.text}`);
    }
  }

  if (input.withdrawEuros) {
    const w = parseEURInput(input.withdrawEuros);
    if (w != null && w > 0) {
      const after = Math.max(0, entity.currentCents - w);
      const newRemaining = Math.max(0, entity.targetCents - after);
      lines.push(
        `Se retirares ${(w / 100).toFixed(2).replace(".", ",")} € de “${entity.name}”, ficas com ${(after / 100).toFixed(2).replace(".", ",")} € e faltam ${(newRemaining / 100).toFixed(2).replace(".", ",")} €.`,
      );
    }
  }

  if (!lines.length) return { ok: false as const, error: "Indica um valor mensal ou um levantamento" };
  return { ok: true as const, text: lines.join("\n\n") };
}

export async function getSavingsModuleData() {
  const { family, membership } = await requireFamilyContext();
  const { space } = await scopeFromSpace();
  const potWhere = potScopeWhere(space, membership.id);
  const goalWhere = goalScopeWhere(space, membership.id);

  const [pots, goals, incomes, expenses, budgets] = await Promise.all([
    prisma.savingPot.findMany({
      where: { familyId: family.id, ...potWhere },
      orderBy: { createdAt: "asc" },
    }),
    prisma.savingsGoal.findMany({
      where: { familyId: family.id, ...goalWhere },
      include: { items: { orderBy: { sortOrder: "asc" } } },
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    }),
    prisma.income.findMany({
      where: {
        familyId: family.id,
        date: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      },
    }),
    prisma.expense.findMany({
      where: {
        familyId: family.id,
        date: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      },
      include: { category: true },
    }),
    prisma.budget.findMany({
      where: {
        familyId: family.id,
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
      },
    }),
  ]);

  const incomeCents = incomes.reduce((s, i) => s + i.amountCents, 0);
  const expenseCents = expenses.reduce((s, e) => s + e.amountCents, 0);
  const budgetLimitCents = budgets.reduce((s, b) => s + b.limitCents, 0);
  const catMap = new Map<string, number>();
  for (const e of expenses) {
    catMap.set(e.category.name, (catMap.get(e.category.name) ?? 0) + e.amountCents);
  }
  const pulse: FinancePulse = {
    incomeCents,
    expenseCents,
    budgetLimitCents,
    categoryBreakdown: [...catMap.entries()].map(([name, cents]) => ({ name, cents })),
  };

  const tips = buildProactiveTips(
    goals.map((g) => ({
      id: g.id,
      name: g.name,
      targetCents: g.targetCents,
      currentCents: g.currentCents,
      deadline: g.deadline,
      isCompleted: g.isCompleted,
    })),
    pulse,
  );

  const investedPots = pots.filter((p) => p.isInvested && p.investedCapitalCents != null);
  let totalInvested = 0;
  let totalAccrued = 0;
  const potViews = pots.map((p) => {
    const progress = goalProgress(p.currentCents, p.targetCents);
    const investment =
      p.isInvested &&
      p.investedCapitalCents != null &&
      p.annualRatePercent != null &&
      p.investmentStartDate
        ? computeInvestmentSnapshot({
            investedCapitalCents: p.investedCapitalCents,
            annualRatePercent: p.annualRatePercent,
            capitalization: p.capitalization,
            interestPeriod: p.interestPeriod,
            startDate: p.investmentStartDate,
          })
        : null;
    if (investment) {
      totalInvested += investment.principalCents;
      totalAccrued += investment.accruedInterestCents;
    }
    return { ...p, progress, investment };
  });

  const activeGoals = goals.filter((g) => !g.isCompleted);
  const completedGoals = goals.filter((g) => g.isCompleted);
  const nextGoal = [...activeGoals].sort((a, b) => {
    const pa = a.currentCents / Math.max(1, a.targetCents);
    const pb = b.currentCents / Math.max(1, b.targetCents);
    return pb - pa;
  })[0];

  const totalStillNeeded = activeGoals.reduce(
    (s, g) => s + Math.max(0, g.targetCents - g.currentCents),
    0,
  );

  return {
    space,
    pots: potViews,
    goals: goals.map((g) => ({
      ...g,
      progress: goalProgress(g.currentCents, g.targetCents),
      remainingCents: Math.max(0, g.targetCents - g.currentCents),
      itemsTotalCents: g.items.reduce((s, it) => s + it.amountCents, 0) || g.targetCents,
    })),
    tips,
    summary: {
      totalSavingsCents: pots.reduce((s, p) => s + p.currentCents, 0),
      totalInvestedCents: totalInvested,
      accruedReturnCents: totalAccrued,
      activeGoals: activeGoals.length,
      completedGoals: completedGoals.length,
      nextGoal: nextGoal
        ? {
            id: nextGoal.id,
            name: nextGoal.name,
            progress: goalProgress(nextGoal.currentCents, nextGoal.targetCents),
            remainingCents: Math.max(0, nextGoal.targetCents - nextGoal.currentCents),
          }
        : null,
      totalStillNeededCents: totalStillNeeded,
    },
  };
}
