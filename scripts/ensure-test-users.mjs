#!/usr/bin/env node
/**
 * Contas de TESTE REAL — sempre vazias (saldo 0, sem movimentos).
 *
 * - familia@nina.app  — conta de teste estável
 * - teste@nina.app    — conta limpa para validar empty state
 *
 * Nunca carrega dados fictícios. Demo só via: DEMO_MODE=true npm run db:demo
 * (conta demo@nina.app — ver prisma/seed.ts).
 *
 * Corre em cada build Vercel para eliminar a causa raiz do “ciclo”:
 * movimentos deixados por seeds antigos ou por testes E2E voltam a aparecer
 * se não forem limpos nestas contas dedicadas.
 */
import bcrypt from "bcryptjs";
import { applyEnsureEnv } from "./ensure-env.mjs";

applyEnsureEnv({ exitOnError: true });

const TEST_ACCOUNTS = [
  {
    email: "familia@nina.app",
    password: "nina123",
    name: "Filipe Casquinha",
    displayName: "Filipe",
    familyName: "Conta de Filipe",
  },
  {
    email: "teste@nina.app",
    password: "nina123",
    name: "Conta de Teste",
    displayName: "Teste",
    familyName: "Conta Teste Nina",
  },
];

/** Wipe all finance content for a family — leave structural empty account. */
async function emptyFamilyFinance(prisma, familyId) {
  await prisma.expenseLineItem.deleteMany({
    where: { expense: { familyId } },
  });
  await prisma.goalItem.deleteMany({
    where: { goal: { familyId } },
  });
  await prisma.savingPot.deleteMany({ where: { familyId } });
  await prisma.expense.deleteMany({ where: { familyId } });
  await prisma.income.deleteMany({ where: { familyId } });
  await prisma.budget.deleteMany({ where: { familyId } });
  await prisma.savingsGoal.deleteMany({ where: { familyId } });
  await prisma.recurringPayment.deleteMany({ where: { familyId } });
  await prisma.alert.deleteMany({ where: { familyId } });
  await prisma.importJob.deleteMany({ where: { familyId } });
  await prisma.aiInsight.deleteMany({ where: { familyId } });
  await prisma.ninaHabitStat.deleteMany({ where: { familyId } });
  await prisma.ninaMemoryRule.deleteMany({ where: { familyId } });
  await prisma.transactionAuditLog.deleteMany({ where: { familyId } });
  await prisma.shoppingListItem.deleteMany({ where: { familyId } });
  await prisma.category.deleteMany({ where: { familyId } });
  await prisma.store.deleteMany({ where: { familyId } });
  await prisma.ninaConnection.deleteMany({ where: { familyId } });
  await prisma.familyInvite.deleteMany({ where: { familyId } });
  await prisma.shoppingList.deleteMany({ where: { familyId } });

  await prisma.financeAccount.deleteMany({ where: { familyId } });
  await prisma.financeAccount.create({
    data: {
      familyId,
      name: "Conta principal",
      type: "CHECKING",
      balanceCents: 0,
    },
  });

  const lists = await prisma.shoppingList.findMany({ where: { familyId } });
  if (lists.length === 0) {
    const owner = await prisma.familyMember.findFirst({
      where: { familyId, role: "OWNER" },
    });
    if (owner) {
      await prisma.shoppingList.create({
        data: {
          familyId,
          createdById: owner.userId,
          name: "Lista de compras",
          isShared: true,
        },
      });
    }
  }
}

async function ensureEmptyTestAccount(prisma, account) {
  const passwordHash = await bcrypt.hash(account.password, 10);
  let user = await prisma.user.findUnique({ where: { email: account.email } });

  if (!user) {
    console.log(`[ensure-test] creating empty test account ${account.email}`);
    user = await prisma.user.create({
      data: {
        name: account.name,
        email: account.email,
        passwordHash,
        theme: "system",
      },
    });
    const family = await prisma.family.create({
      data: {
        name: account.familyName,
        kind: "INDIVIDUAL",
        currency: "EUR",
        timezone: "Europe/Lisbon",
      },
    });
    await prisma.familyMember.create({
      data: {
        familyId: family.id,
        userId: user.id,
        displayName: account.displayName,
        role: "OWNER",
        color: "#1e3a5f",
      },
    });
    await emptyFamilyFinance(prisma, family.id);
    console.log(`[ensure-test] ${account.email} ready (empty)`);
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, name: account.name },
  });

  let memberships = await prisma.familyMember.findMany({
    where: { userId: user.id, role: "OWNER" },
    include: { family: true },
  });

  if (memberships.length === 0) {
    const family = await prisma.family.create({
      data: {
        name: account.familyName,
        kind: "INDIVIDUAL",
        currency: "EUR",
        timezone: "Europe/Lisbon",
      },
    });
    await prisma.familyMember.create({
      data: {
        familyId: family.id,
        userId: user.id,
        displayName: account.displayName,
        role: "OWNER",
        color: "#1e3a5f",
      },
    });
    memberships = await prisma.familyMember.findMany({
      where: { userId: user.id, role: "OWNER" },
      include: { family: true },
    });
  }

  for (const m of memberships) {
    const incomeCount = await prisma.income.count({ where: { familyId: m.familyId } });
    const expenseCount = await prisma.expense.count({ where: { familyId: m.familyId } });
    console.log(
      `[ensure-test] emptying ${account.email} (${incomeCount} incomes, ${expenseCount} expenses)`,
    );
    await emptyFamilyFinance(prisma, m.familyId);
    await prisma.family.update({
      where: { id: m.familyId },
      data: {
        name: account.familyName,
        kind: "INDIVIDUAL",
        inviteCode: null,
      },
    });
  }

  console.log(`[ensure-test] ${account.email} is empty and ready`);
}

async function main() {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();

  try {
    for (const account of TEST_ACCOUNTS) {
      await ensureEmptyTestAccount(prisma, account);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("[ensure-test] failed", err);
  process.exit(1);
});
