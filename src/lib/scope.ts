import type { FinanceScope, Prisma } from "@prisma/client";
import type { NinaSpace } from "@/actions/household";

export function financeScopeFromSpace(space: NinaSpace): FinanceScope {
  return space === "family" ? "FAMILY" : "PERSONAL";
}

/** Filtro Prisma para receitas/despesas conforme o espaço Nina. */
export function expenseScopeWhere(
  space: NinaSpace,
  memberId: string,
): Prisma.ExpenseWhereInput {
  if (space === "family") return { scope: "FAMILY" };
  return { scope: "PERSONAL", memberId };
}

export function incomeScopeWhere(
  space: NinaSpace,
  memberId: string,
): Prisma.IncomeWhereInput {
  if (space === "family") return { scope: "FAMILY" };
  return { scope: "PERSONAL", memberId };
}

export function goalScopeWhere(
  space: NinaSpace,
  memberId: string,
): Prisma.SavingsGoalWhereInput {
  if (space === "family") return { scope: "FAMILY" };
  return {
    scope: "PERSONAL",
    OR: [{ ownerMemberId: memberId }, { ownerMemberId: null }],
  };
}

export function potScopeWhere(
  space: NinaSpace,
  memberId: string,
): Prisma.SavingPotWhereInput {
  if (space === "family") return { scope: "FAMILY" };
  return {
    scope: "PERSONAL",
    OR: [{ ownerMemberId: memberId }, { ownerMemberId: null }],
  };
}

export function spaceLabel(space: NinaSpace): string {
  return space === "family" ? "Conta Familiar" : "As Minhas Finanças";
}
