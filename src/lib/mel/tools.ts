import type { FamilyRole } from "@prisma/client";
import type { ChatCompletionTool } from "openai/resources/chat/completions";
import { prisma } from "@/lib/db";
import { formatEUR, monthBounds, monthLabel, currentYearMonth } from "@/lib/money";
import { expenseScopeWhere, incomeScopeWhere, goalScopeWhere, potScopeWhere } from "@/lib/scope";
import type { NinaSpace } from "@/actions/household";
import { canEditFinances } from "@/domain/household";

/** Contexto autenticado — nunca vem do modelo. */
export type MelAuthContext = {
  userId: string;
  memberId: string;
  familyId: string;
  role: FamilyRole;
  /** Espaço UI actual (cookie) — tools podem pedir familiar explicitamente */
  space: NinaSpace;
  displayName: string;
  familyName: string;
};

function resolveMonth(offset = 0): { year: number; month: number; label: string; start: Date; end: Date } {
  const now = currentYearMonth();
  const d = new Date(Date.UTC(now.year, now.month - 1 + offset, 1));
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth() + 1;
  const { start, end } = monthBounds(year, month);
  return { year, month, label: monthLabel(year, month), start, end };
}

function spaceFromArg(
  auth: MelAuthContext,
  requested?: string | null,
): { space: NinaSpace; memberId: string } {
  if (requested === "family" || requested === "familiar") {
    return { space: "family", memberId: auth.memberId };
  }
  if (requested === "personal" || requested === "pessoal") {
    return { space: "personal", memberId: auth.memberId };
  }
  return { space: auth.space, memberId: auth.memberId };
}

export const MEL_TOOL_DEFINITIONS: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "get_financial_summary",
      description:
        "Resumo financeiro do utilizador autenticado: receitas, despesas, saldo do mês e orçamento. Usa monthOffset=0 mês actual, -1 mês anterior.",
      parameters: {
        type: "object",
        properties: {
          monthOffset: {
            type: "integer",
            description: "0 = mês actual, -1 = mês anterior, -2 = há dois meses",
          },
          scope: {
            type: "string",
            enum: ["personal", "family", "auto"],
            description: "personal = só o utilizador; family = dados da família; auto = espaço actual da UI",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_expenses_by_category",
      description: "Despesas agregadas por categoria no período. Opcionalmente filtra por nome de categoria.",
      parameters: {
        type: "object",
        properties: {
          monthOffset: { type: "integer" },
          scope: { type: "string", enum: ["personal", "family", "auto"] },
          categoryHint: {
            type: "string",
            description: "Nome ou parte do nome da categoria (ex.: restaurantes, supermercado)",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_income_summary",
      description: "Receitas do período para o utilizador/família autorizados.",
      parameters: {
        type: "object",
        properties: {
          monthOffset: { type: "integer" },
          scope: { type: "string", enum: ["personal", "family", "auto"] },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_budget_status",
      description: "Estado dos orçamentos do mês actual vs despesas.",
      parameters: {
        type: "object",
        properties: {
          scope: { type: "string", enum: ["personal", "family", "auto"] },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_savings_and_goals",
      description: "Poupanças (pots) e objetivos de poupança do utilizador/família.",
      parameters: {
        type: "object",
        properties: {
          scope: { type: "string", enum: ["personal", "family", "auto"] },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_family_financial_summary",
      description:
        "Resumo apenas dos movimentos da Conta Familiar (scope FAMILY). Requer que o utilizador seja membro da família.",
      parameters: {
        type: "object",
        properties: {
          monthOffset: { type: "integer" },
        },
      },
    },
  },
];

export async function executeMelTool(
  name: string,
  rawArgs: string,
  auth: MelAuthContext,
): Promise<unknown> {
  let args: Record<string, unknown> = {};
  try {
    args = rawArgs ? (JSON.parse(rawArgs) as Record<string, unknown>) : {};
  } catch {
    return { error: "Parâmetros inválidos." };
  }

  // Nunca aceitar userId/familyId do modelo
  if ("userId" in args || "familyId" in args || "memberId" in args) {
    console.warn("[mel] tool attempt to override identity", { name, userId: auth.userId });
    return { error: "Pedido inválido." };
  }

  const monthOffset = Number(args.monthOffset ?? 0);
  const offset = Number.isFinite(monthOffset) ? Math.max(-12, Math.min(0, Math.trunc(monthOffset))) : 0;

  switch (name) {
    case "get_financial_summary":
      return getFinancialSummary(auth, offset, String(args.scope || "auto"));
    case "get_expenses_by_category":
      return getExpensesByCategory(
        auth,
        offset,
        String(args.scope || "auto"),
        typeof args.categoryHint === "string" ? args.categoryHint : undefined,
      );
    case "get_income_summary":
      return getIncomeSummary(auth, offset, String(args.scope || "auto"));
    case "get_budget_status":
      return getBudgetStatus(auth, String(args.scope || "auto"));
    case "get_savings_and_goals":
      return getSavingsAndGoals(auth, String(args.scope || "auto"));
    case "get_family_financial_summary":
      return getFinancialSummary(auth, offset, "family");
    default:
      return { error: "Ferramenta desconhecida." };
  }
}

async function getFinancialSummary(auth: MelAuthContext, monthOffset: number, scopeArg: string) {
  const { space, memberId } = spaceFromArg(auth, scopeArg);
  const period = resolveMonth(monthOffset);
  const expWhere = expenseScopeWhere(space, memberId);
  const incWhere = incomeScopeWhere(space, memberId);

  const [incomeAgg, expenseAgg, budgets] = await Promise.all([
    prisma.income.aggregate({
      where: { familyId: auth.familyId, date: { gte: period.start, lte: period.end }, ...incWhere },
      _sum: { amountCents: true },
      _count: true,
    }),
    prisma.expense.aggregate({
      where: { familyId: auth.familyId, date: { gte: period.start, lte: period.end }, ...expWhere },
      _sum: { amountCents: true },
      _count: true,
    }),
    prisma.budget.findMany({
      where: { familyId: auth.familyId, year: period.year, month: period.month },
    }),
  ]);

  const incomeCents = incomeAgg._sum.amountCents ?? 0;
  const expenseCents = expenseAgg._sum.amountCents ?? 0;
  const budgetLimitCents = budgets.reduce((s, b) => s + b.limitCents, 0);

  return {
    scope: space,
    period: period.label,
    income: formatEUR(incomeCents),
    incomeCents,
    incomeCount: incomeAgg._count,
    expenses: formatEUR(expenseCents),
    expenseCents,
    expenseCount: expenseAgg._count,
    balance: formatEUR(incomeCents - expenseCents),
    balanceCents: incomeCents - expenseCents,
    budgetLimit: budgetLimitCents > 0 ? formatEUR(budgetLimitCents) : null,
    budgetUsedPercent:
      budgetLimitCents > 0
        ? Math.round((expenseCents / budgetLimitCents) * 1000) / 10
        : null,
    note:
      expenseAgg._count === 0 && incomeAgg._count === 0
        ? "Sem movimentos registados neste período."
        : undefined,
  };
}

async function getExpensesByCategory(
  auth: MelAuthContext,
  monthOffset: number,
  scopeArg: string,
  categoryHint?: string,
) {
  const { space, memberId } = spaceFromArg(auth, scopeArg);
  const period = resolveMonth(monthOffset);
  const expWhere = expenseScopeWhere(space, memberId);

  const expenses = await prisma.expense.findMany({
    where: { familyId: auth.familyId, date: { gte: period.start, lte: period.end }, ...expWhere },
    include: { category: true },
  });

  const hint = categoryHint?.trim().toLowerCase();
  const filtered = hint
    ? expenses.filter(
        (e) =>
          e.category.name.toLowerCase().includes(hint) ||
          e.category.slug.toLowerCase().includes(hint) ||
          (e.description || "").toLowerCase().includes(hint),
      )
    : expenses;

  const byCat = new Map<string, number>();
  for (const e of filtered) {
    byCat.set(e.category.name, (byCat.get(e.category.name) || 0) + e.amountCents);
  }
  const categories = [...byCat.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([name, cents]) => ({ name, total: formatEUR(cents), cents }));

  const totalCents = filtered.reduce((s, e) => s + e.amountCents, 0);

  return {
    scope: space,
    period: period.label,
    categoryFilter: hint || null,
    total: formatEUR(totalCents),
    totalCents,
    count: filtered.length,
    categories,
    note: filtered.length === 0 ? "Ainda não há despesas registadas para este filtro/período." : undefined,
  };
}

async function getIncomeSummary(auth: MelAuthContext, monthOffset: number, scopeArg: string) {
  const { space, memberId } = spaceFromArg(auth, scopeArg);
  const period = resolveMonth(monthOffset);
  const incWhere = incomeScopeWhere(space, memberId);

  const incomes = await prisma.income.findMany({
    where: { familyId: auth.familyId, date: { gte: period.start, lte: period.end }, ...incWhere },
    include: { category: true },
    orderBy: { date: "desc" },
    take: 20,
  });

  const totalCents = incomes.reduce((s, i) => s + i.amountCents, 0);
  return {
    scope: space,
    period: period.label,
    total: formatEUR(totalCents),
    totalCents,
    count: incomes.length,
    items: incomes.slice(0, 8).map((i) => ({
      description: i.description,
      category: i.category.name,
      amount: formatEUR(i.amountCents),
      date: i.date.toISOString().slice(0, 10),
    })),
    note: incomes.length === 0 ? "Ainda não há receitas registadas neste período." : undefined,
  };
}

async function getBudgetStatus(auth: MelAuthContext, scopeArg: string) {
  const { space, memberId } = spaceFromArg(auth, scopeArg);
  const period = resolveMonth(0);
  const expWhere = expenseScopeWhere(space, memberId);

  const [budgets, expenses] = await Promise.all([
    prisma.budget.findMany({
      where: { familyId: auth.familyId, year: period.year, month: period.month },
      include: { category: true },
    }),
    prisma.expense.findMany({
      where: { familyId: auth.familyId, date: { gte: period.start, lte: period.end }, ...expWhere },
      include: { category: true },
    }),
  ]);

  if (budgets.length === 0) {
    return {
      scope: space,
      period: period.label,
      budgets: [],
      note: "Ainda não tens orçamentos definidos para este mês.",
    };
  }

  const spentByCat = new Map<string, number>();
  for (const e of expenses) {
    spentByCat.set(e.categoryId, (spentByCat.get(e.categoryId) || 0) + e.amountCents);
  }

  return {
    scope: space,
    period: period.label,
    budgets: budgets.map((b) => {
      const spent = spentByCat.get(b.categoryId) || 0;
      return {
        category: b.category.name,
        limit: formatEUR(b.limitCents),
        spent: formatEUR(spent),
        remaining: formatEUR(b.limitCents - spent),
        usedPercent: b.limitCents > 0 ? Math.round((spent / b.limitCents) * 1000) / 10 : 0,
      };
    }),
  };
}

async function getSavingsAndGoals(auth: MelAuthContext, scopeArg: string) {
  const { space, memberId } = spaceFromArg(auth, scopeArg);
  const goalWhere = goalScopeWhere(space, memberId);
  const potWhere = potScopeWhere(space, memberId);

  const [goals, pots] = await Promise.all([
    prisma.savingsGoal.findMany({
      where: { familyId: auth.familyId, ...goalWhere },
      orderBy: { createdAt: "asc" },
    }),
    prisma.savingPot.findMany({
      where: { familyId: auth.familyId, ...potWhere },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return {
    scope: space,
    goals: goals.map((g) => ({
      name: g.name,
      current: formatEUR(g.currentCents),
      target: formatEUR(g.targetCents),
      progressPercent:
        g.targetCents > 0
          ? Math.min(100, Math.round((g.currentCents / g.targetCents) * 1000) / 10)
          : 0,
      completed: g.isCompleted,
    })),
    pots: pots.map((p) => ({
      name: p.name,
      balance: formatEUR(p.currentCents),
    })),
    note:
      goals.length === 0 && pots.length === 0
        ? "Ainda não tens objetivos nem poupanças registadas."
        : undefined,
    canEdit: canEditFinances(auth.role),
  };
}
