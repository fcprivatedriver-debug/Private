/**
 * Testes de integração MEL contra a BD demo (sem OpenAI obrigatória).
 * npx tsx scripts/test-mel-db.ts
 */
import assert from "node:assert/strict";
import { prisma } from "../src/lib/db";
import { executeMelTool, type MelAuthContext } from "../src/lib/mel/tools";
import { checkMelRateLimit, estimateCostMicros } from "../src/lib/mel/usage";
import { isOpenAiConfigured, resolveMelModel } from "../src/lib/mel/config";

async function main() {
  const user = await prisma.user.findUnique({ where: { email: "demo@nina.app" } });
  assert.ok(user, "demo user");
  const membership = await prisma.familyMember.findFirst({
    where: { userId: user.id },
    include: { family: true },
  });
  assert.ok(membership, "demo membership");

  const auth: MelAuthContext = {
    userId: user.id,
    memberId: membership.id,
    familyId: membership.familyId,
    role: membership.role,
    space: "personal",
    displayName: membership.displayName || user.name,
    familyName: membership.family.name,
  };

  // 1) despesas mês actual
  const summary = (await executeMelTool(
    "get_financial_summary",
    JSON.stringify({ monthOffset: 0, scope: "personal" }),
    auth,
  )) as { expenseCents: number; expenses: string };
  console.log("1 despesas mês:", summary.expenses, summary.expenseCents);
  assert.ok(typeof summary.expenseCents === "number");

  // 2) mês anterior
  const prev = (await executeMelTool(
    "get_financial_summary",
    JSON.stringify({ monthOffset: -1, scope: "personal" }),
    auth,
  )) as { period: string; expenseCents: number };
  console.log("2 mês anterior:", prev.period, prev.expenseCents);
  assert.ok(prev.period);

  // 3) categoria
  const byCat = (await executeMelTool(
    "get_expenses_by_category",
    JSON.stringify({ monthOffset: 0, categoryHint: "restaurante" }),
    auth,
  )) as { totalCents: number; note?: string };
  console.log("3 categoria restaurante:", byCat.totalCents, byCat.note || "ok");

  // 4) familiar
  const fam = (await executeMelTool(
    "get_family_financial_summary",
    JSON.stringify({ monthOffset: 0 }),
    auth,
  )) as { scope: string; expenseCents: number };
  console.log("4 familiar:", fam.scope, fam.expenseCents);
  assert.equal(fam.scope, "family");

  // 5) injection
  const inj = await executeMelTool(
    "get_financial_summary",
    JSON.stringify({ userId: "outro", familyId: "x" }),
    auth,
  );
  assert.deepEqual(inj, { error: "Pedido inválido." });
  console.log("5 injection bloqueada: ok");

  // 6) user sem despesas
  const emptyUser = await prisma.user.findUnique({ where: { email: "familia@nina.app" } });
  assert.ok(emptyUser);
  const emptyMem = await prisma.familyMember.findFirst({
    where: { userId: emptyUser.id },
    include: { family: true },
  });
  assert.ok(emptyMem);
  const emptyAuth: MelAuthContext = {
    ...auth,
    userId: emptyUser.id,
    memberId: emptyMem.id,
    familyId: emptyMem.familyId,
    displayName: emptyMem.displayName || emptyUser.name,
    familyName: emptyMem.family.name,
  };
  const emptySum = (await executeMelTool(
    "get_financial_summary",
    JSON.stringify({ monthOffset: 0 }),
    emptyAuth,
  )) as { expenseCents: number; note?: string };
  console.log("6 sem despesas:", emptySum.expenseCents, emptySum.note);
  assert.equal(emptySum.expenseCents, 0);

  // 7) rate limit check (não força limite — só API)
  const rl = await checkMelRateLimit(user.id);
  console.log("7 rate limit:", rl);

  // 8) API key
  console.log("8 openai configured:", isOpenAiConfigured(), "model:", resolveMelModel());
  console.log("9 cost estimate sample:", estimateCostMicros(resolveMelModel(), 500, 200));

  console.log("\nALL DB INTEGRATION CHECKS PASSED");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
