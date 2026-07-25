#!/usr/bin/env node
/**
 * Ensures the real test account familia@nina.app exists and is EMPTY
 * (no demo incomes/expenses/charts). Never loads ficticious demo data.
 *
 * Full demo data is ONLY created via: DEMO_MODE=true npm run db:demo
 * (uses demo@nina.app — see prisma/seed.ts).
 */
import bcrypt from "bcryptjs";
import { applyEnsureEnv } from "./ensure-env.mjs";

applyEnsureEnv({ exitOnError: true });

const TEST_EMAIL = "familia@nina.app";
const TEST_PASSWORD = "nina123";
const TEST_NAME = "Filipe Casquinha";

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

async function main() {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);

  try {
    let user = await prisma.user.findUnique({ where: { email: TEST_EMAIL } });

    if (!user) {
      console.log(`[ensure-test] creating empty test account ${TEST_EMAIL}`);
      user = await prisma.user.create({
        data: {
          name: TEST_NAME,
          email: TEST_EMAIL,
          passwordHash,
          theme: "system",
        },
      });
      const family = await prisma.family.create({
        data: {
          name: "Conta de Filipe",
          kind: "INDIVIDUAL",
          currency: "EUR",
          timezone: "Europe/Lisbon",
        },
      });
      await prisma.familyMember.create({
        data: {
          familyId: family.id,
          userId: user.id,
          displayName: "Filipe",
          role: "OWNER",
          color: "#1e3a5f",
        },
      });
      await emptyFamilyFinance(prisma, family.id);
      console.log(`[ensure-test] ${TEST_EMAIL} ready (empty)`);
      return;
    }

    // Keep password predictable for the dedicated test account
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    const memberships = await prisma.familyMember.findMany({
      where: { userId: user.id, role: "OWNER" },
      include: { family: true },
    });

    if (memberships.length === 0) {
      const family = await prisma.family.create({
        data: {
          name: "Conta de Filipe",
          kind: "INDIVIDUAL",
          currency: "EUR",
          timezone: "Europe/Lisbon",
        },
      });
      await prisma.familyMember.create({
        data: {
          familyId: family.id,
          userId: user.id,
          displayName: "Filipe",
          role: "OWNER",
          color: "#1e3a5f",
        },
      });
      await emptyFamilyFinance(prisma, family.id);
      console.log(`[ensure-test] attached empty family to ${TEST_EMAIL}`);
      return;
    }

    for (const m of memberships) {
      const incomeCount = await prisma.income.count({ where: { familyId: m.familyId } });
      const expenseCount = await prisma.expense.count({ where: { familyId: m.familyId } });
      // Only strip the old seeded demo household — never wipe real test movements again.
      const isLegacyDemo =
        m.family.inviteCode === "NINA-DEMO01" ||
        m.family.name === "Família Casquinha";

      if (isLegacyDemo) {
        console.log(
          `[ensure-test] removing legacy demo seed from ${TEST_EMAIL} (${incomeCount} incomes, ${expenseCount} expenses)`,
        );
        await emptyFamilyFinance(prisma, m.familyId);
        await prisma.family.update({
          where: { id: m.familyId },
          data: {
            name: "Conta de Filipe",
            kind: "INDIVIDUAL",
            inviteCode: null,
          },
        });
      } else {
        const accounts = await prisma.financeAccount.count({
          where: { familyId: m.familyId },
        });
        if (accounts === 0) {
          await prisma.financeAccount.create({
            data: {
              familyId: m.familyId,
              name: "Conta principal",
              type: "CHECKING",
              balanceCents: 0,
            },
          });
        }
        console.log(
          `[ensure-test] ${TEST_EMAIL} family ok (${incomeCount} incomes, ${expenseCount} expenses)`,
        );
      }
    }

    console.log(`[ensure-test] ${TEST_EMAIL} is empty and ready`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("[ensure-test] failed", err);
  process.exit(1);
});
