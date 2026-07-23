import "dotenv/config";
import bcrypt from "bcryptjs";
import {
  PrismaClient,
  type PaymentMethod,
  type GoalType,
} from "@prisma/client";
import {
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
} from "../src/domain/categories";
import { DEMO_PASSWORD } from "../src/lib/demo-mode";

const prisma = new PrismaClient();

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(12, 0, 0, 0);
  return d;
}

async function seedCategories(familyId: string) {
  const expenseCats = [];
  for (let i = 0; i < DEFAULT_EXPENSE_CATEGORIES.length; i++) {
    const c = DEFAULT_EXPENSE_CATEGORIES[i];
    expenseCats.push(
      await prisma.category.create({
        data: {
          familyId,
          name: c.name,
          slug: c.slug,
          icon: c.icon,
          color: c.color,
          kind: "EXPENSE",
          isSystem: true,
          sortOrder: i,
        },
      }),
    );
  }
  const incomeCats = [];
  for (let i = 0; i < DEFAULT_INCOME_CATEGORIES.length; i++) {
    const c = DEFAULT_INCOME_CATEGORIES[i];
    incomeCats.push(
      await prisma.category.create({
        data: {
          familyId,
          name: c.name,
          slug: c.slug,
          icon: c.icon,
          color: c.color,
          kind: "INCOME",
          isSystem: true,
          sortOrder: i,
        },
      }),
    );
  }
  return { expenseCats, incomeCats };
}

async function main() {
  console.log("🌱 A preparar dados demo MAFIL…");

  await prisma.expenseLineItem.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.income.deleteMany();
  await prisma.budget.deleteMany();
  await prisma.savingsGoal.deleteMany();
  await prisma.recurringPayment.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.importJob.deleteMany();
  await prisma.aiInsight.deleteMany();
  await prisma.store.deleteMany();
  await prisma.category.deleteMany();
  await prisma.financeAccount.deleteMany();
  await prisma.familyMember.deleteMany();
  await prisma.family.deleteMany();
  await prisma.session.deleteMany();
  await prisma.authAccount.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const filipe = await prisma.user.create({
    data: {
      name: "Filipe Casquinha",
      email: "familia@mafil.pt",
      passwordHash,
      theme: "system",
    },
  });

  const ana = await prisma.user.create({
    data: {
      name: "Ana Silva",
      email: "ana@mafil.pt",
      passwordHash,
      theme: "light",
    },
  });

  const family = await prisma.family.create({
    data: {
      name: "Família Casquinha",
      currency: "EUR",
      timezone: "Europe/Lisbon",
    },
  });

  const memberFilipe = await prisma.familyMember.create({
    data: {
      familyId: family.id,
      userId: filipe.id,
      displayName: "Filipe",
      role: "OWNER",
      color: "#1e3a5f",
    },
  });

  const memberAna = await prisma.familyMember.create({
    data: {
      familyId: family.id,
      userId: ana.id,
      displayName: "Ana",
      role: "ADMIN",
      color: "#0f7a4a",
    },
  });

  const { expenseCats, incomeCats } = await seedCategories(family.id);
  const bySlug = Object.fromEntries(
    [...expenseCats, ...incomeCats].map((c) => [c.slug, c]),
  );

  const contaCGD = await prisma.financeAccount.create({
    data: {
      familyId: family.id,
      name: "Conta CGD",
      type: "CHECKING",
      bankName: "Caixa Geral de Depósitos",
      ibanMasked: "PT50 **** **** **** 1234",
      balanceCents: 425000,
      color: "#1e3a5f",
    },
  });

  const contaRevolut = await prisma.financeAccount.create({
    data: {
      familyId: family.id,
      name: "Revolut",
      type: "WALLET",
      bankName: "Revolut",
      balanceCents: 82000,
      color: "#0f172a",
    },
  });

  const poupanca = await prisma.financeAccount.create({
    data: {
      familyId: family.id,
      name: "Poupança",
      type: "SAVINGS",
      bankName: "CGD",
      balanceCents: 350000,
      color: "#0f7a4a",
    },
  });

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  // Receitas do mês
  await prisma.income.createMany({
    data: [
      {
        familyId: family.id,
        memberId: memberFilipe.id,
        accountId: contaCGD.id,
        categoryId: bySlug.salario.id,
        createdById: filipe.id,
        amountCents: 185000,
        date: daysAgo(20),
        description: "Salário Filipe",
      },
      {
        familyId: family.id,
        memberId: memberAna.id,
        accountId: contaCGD.id,
        categoryId: bySlug.salario.id,
        createdById: ana.id,
        amountCents: 160000,
        date: daysAgo(19),
        description: "Salário Ana",
      },
      {
        familyId: family.id,
        memberId: memberFilipe.id,
        accountId: contaRevolut.id,
        categoryId: bySlug["trabalho-extra"].id,
        createdById: filipe.id,
        amountCents: 35000,
        date: daysAgo(8),
        description: "Freelance design",
        notes: "Projeto cliente B2B",
      },
      {
        familyId: family.id,
        memberId: memberFilipe.id,
        accountId: contaRevolut.id,
        categoryId: bySlug.investimentos.id,
        createdById: filipe.id,
        amountCents: 4200,
        date: daysAgo(3),
        description: "Dividendos ETF",
      },
    ],
  });

  // Despesas do mês
  type ExpSeed = {
    days: number;
    cents: number;
    cat: string;
    desc: string;
    store?: string;
    method?: PaymentMethod;
    member?: "f" | "a";
    account?: "cgd" | "rev";
    time?: string;
  };

  const expenses: ExpSeed[] = [
    { days: 1, cents: 6780, cat: "supermercado", desc: "Compras semanais", store: "Continente", method: "DEBIT_CARD", member: "a" },
    { days: 2, cents: 4520, cat: "combustivel", desc: "Gasóleo", store: "Galp", method: "MB_WAY", member: "f", time: "08:15" },
    { days: 3, cents: 2890, cat: "restaurantes", desc: "Almoço equipa", store: "Mercado da Ribeira", method: "REVOLUT", member: "f", account: "rev" },
    { days: 4, cents: 1599, cat: "internet", desc: "NOS Fibra", store: "NOS", method: "DIRECT_DEBIT", member: "f" },
    { days: 5, cents: 3200, cat: "luz", desc: "Fatura EDP", store: "EDP", method: "DIRECT_DEBIT" },
    { days: 6, cents: 1840, cat: "agua", desc: "Águas de Lisboa", store: "EPAL", method: "DIRECT_DEBIT" },
    { days: 7, cents: 5400, cat: "supermercado", desc: "Pingo Doce", store: "Pingo Doce", method: "DEBIT_CARD", member: "a" },
    { days: 8, cents: 1299, cat: "lazer", desc: "Netflix", store: "Netflix", method: "CREDIT_CARD" },
    { days: 9, cents: 999, cat: "lazer", desc: "Spotify Family", store: "Spotify", method: "CREDIT_CARD" },
    { days: 10, cents: 8500, cat: "saude", desc: "Consulta dentista", store: "Clínica Saúde", method: "MB_WAY", member: "a" },
    { days: 11, cents: 2100, cat: "farmacia", desc: "Medicamentos", store: "Farmácia Central", method: "MB_WAY", member: "a" },
    { days: 12, cents: 35000, cat: "casa", desc: "Renda", store: "Senhorio", method: "TRANSFER", member: "f" },
    { days: 13, cents: 4200, cat: "telemoveis", desc: "Vodafone + MEO", store: "Operadoras", method: "DIRECT_DEBIT" },
    { days: 14, cents: 1890, cat: "transportes", desc: "Via Verde", store: "Via Verde", method: "DIRECT_DEBIT" },
    { days: 15, cents: 6700, cat: "roupa", desc: "Roupa crianças", store: "Zara", method: "DEBIT_CARD", member: "a" },
    { days: 16, cents: 3100, cat: "animais", desc: "Ração + vet", store: "Pet Food", method: "DEBIT_CARD" },
    { days: 17, cents: 5500, cat: "lazer", desc: "Cinema + jantar", store: "NOS Cinemas", method: "REVOLUT", account: "rev", member: "f" },
    { days: 18, cents: 2800, cat: "carregamentos-eletricos", desc: "Supercharger", store: "Tesla", method: "CREDIT_CARD", member: "f" },
  ];

  for (const e of expenses) {
    await prisma.expense.create({
      data: {
        familyId: family.id,
        memberId: e.member === "a" ? memberAna.id : memberFilipe.id,
        accountId: e.account === "rev" ? contaRevolut.id : contaCGD.id,
        categoryId: bySlug[e.cat].id,
        createdById: e.member === "a" ? ana.id : filipe.id,
        amountCents: e.cents,
        date: daysAgo(e.days),
        time: e.time ?? "12:30",
        description: e.desc,
        storeName: e.store,
        paymentMethod: e.method ?? "DEBIT_CARD",
      },
    });
  }

  // Orçamentos
  const budgetSpecs = [
    ["supermercado", 25000],
    ["combustivel", 12000],
    ["restaurantes", 10000],
    ["lazer", 8000],
    ["casa", 40000],
    ["transportes", 5000],
  ] as const;

  for (const [slug, limit] of budgetSpecs) {
    await prisma.budget.create({
      data: {
        familyId: family.id,
        categoryId: bySlug[slug].id,
        year,
        month,
        limitCents: limit,
      },
    });
  }

  // Objetivos
  const goals: { name: string; type: GoalType; target: number; current: number; days: number }[] = [
    { name: "Férias Algarve", type: "VACATION", target: 250000, current: 120000, days: 90 },
    { name: "Fundo de emergência", type: "EMERGENCY", target: 500000, current: 350000, days: 365 },
    { name: "Entrada carro", type: "CAR", target: 800000, current: 210000, days: 180 },
  ];

  for (const g of goals) {
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + g.days);
    await prisma.savingsGoal.create({
      data: {
        familyId: family.id,
        name: g.name,
        type: g.type,
        targetCents: g.target,
        currentCents: g.current,
        deadline,
        color: "#0f7a4a",
      },
    });
  }

  // Recorrentes
  const next = new Date();
  next.setMonth(next.getMonth() + 1);
  next.setDate(5);

  const recurring = [
    { name: "Renda", cat: "casa", cents: 35000, day: 1 },
    { name: "Água", cat: "agua", cents: 1800, day: 10 },
    { name: "Luz", cat: "luz", cents: 3200, day: 12 },
    { name: "Internet NOS", cat: "internet", cents: 1599, day: 8 },
    { name: "Netflix", cat: "lazer", cents: 1299, day: 15 },
    { name: "Spotify", cat: "lazer", cents: 999, day: 15 },
    { name: "Ginásio", cat: "lazer", cents: 3990, day: 1 },
  ];

  for (const r of recurring) {
    const due = new Date(year, month - 1, r.day);
    if (due < now) due.setMonth(due.getMonth() + 1);
    await prisma.recurringPayment.create({
      data: {
        familyId: family.id,
        categoryId: bySlug[r.cat].id,
        accountId: contaCGD.id,
        name: r.name,
        amountCents: r.cents,
        frequency: "MONTHLY",
        dayOfMonth: r.day,
        nextDueDate: due,
        paymentMethod: "DIRECT_DEBIT",
      },
    });
  }

  await prisma.alert.createMany({
    data: [
      {
        familyId: family.id,
        userId: filipe.id,
        type: "BUDGET_THRESHOLD",
        title: "Orçamento de restaurantes a 75%",
        message: "Já utilizou 75% do orçamento de restaurantes este mês.",
        level: "warning",
      },
      {
        familyId: family.id,
        userId: filipe.id,
        type: "RECURRING_DUE",
        title: "Renda a pagar em breve",
        message: "O pagamento da renda está agendado para os próximos dias.",
        level: "info",
      },
      {
        familyId: family.id,
        userId: ana.id,
        type: "GOAL_NEAR",
        title: "Férias Algarve a 48%",
        message: "O objetivo de férias está quase a meio. Continue a poupar!",
        level: "success",
        isRead: false,
      },
    ],
  });

  await prisma.aiInsight.createMany({
    data: [
      {
        familyId: family.id,
        userId: filipe.id,
        kind: "habit",
        title: "Supermercado é a maior fatia variável",
        body: "As compras em Continente e Pingo Doce concentram a maior parte das despesas variáveis. Listas semanais podem reduzir 10–15%.",
        severity: "info",
      },
      {
        familyId: family.id,
        userId: filipe.id,
        kind: "save",
        title: "Oportunidade de poupança em lazer digital",
        body: "Netflix + Spotify + Ginásio somam cerca de 63€/mês. Avalie se todos os serviços são usados regularmente.",
        severity: "success",
      },
    ],
  });

  // Atualizar saldo poupança account reference
  void poupanca;

  console.log("✅ Demo MAFIL pronta");
  console.log("   Email: familia@mafil.pt");
  console.log(`   Password: ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
