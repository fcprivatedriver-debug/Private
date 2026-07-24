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
import { DEMO_PASSWORD, isDemoMode } from "../src/lib/demo-mode";

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
  if (!isDemoMode() && process.env.ALLOW_DEMO_SEED !== "true") {
    console.error(
      "⛔ Seed demo bloqueado. Contas reais nunca recebem dados fictícios.\n" +
        "   Para carregar a demo: DEMO_MODE=true npm run db:demo",
    );
    process.exit(1);
  }

  console.log("🌱 A preparar dados demo Nina…");

  await prisma.expenseLineItem.deleteMany();
  await prisma.goalItem.deleteMany();
  await prisma.savingPot.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.income.deleteMany();
  await prisma.budget.deleteMany();
  await prisma.savingsGoal.deleteMany();
  await prisma.recurringPayment.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.importJob.deleteMany();
  await prisma.aiInsight.deleteMany();
  await prisma.ninaHabitStat.deleteMany();
  await prisma.ninaMemoryRule.deleteMany();
  await prisma.familyInvite.deleteMany();
  await prisma.ninaConnection.deleteMany();
  await prisma.shoppingListItem.deleteMany();
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
      email: "familia@nina.app",
      passwordHash,
      theme: "system",
      biometricsEnabled: true,
      automationLevel: "VOICE_EMAIL",
    },
  });

  const ana = await prisma.user.create({
    data: {
      name: "Nina Assistente",
      email: "nina@nina.app",
      passwordHash,
      theme: "light",
      biometricsEnabled: true,
      automationLevel: "VOICE",
    },
  });

  const family = await prisma.family.create({
    data: {
      name: "Família Casquinha",
      currency: "EUR",
      timezone: "Europe/Lisbon",
      kind: "FAMILY",
      inviteCode: "NINA-DEMO01",
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
      displayName: "Nina",
      role: "ADMIN",
      color: "#0f7a4a",
    },
  });

  const { expenseCats, incomeCats } = await seedCategories(family.id);

  // Subcategorias de exemplo
  const superCat = expenseCats.find((c) => c.slug === "supermercado")!;
  const restoCat = expenseCats.find((c) => c.slug === "restaurantes")!;
  for (const [name, slug, parentId] of [
    ["Frescos", "supermercado-frescos", superCat.id],
    ["Mercearia", "supermercado-mercearia", superCat.id],
    ["Café", "restaurantes-cafe", restoCat.id],
    ["Take-away", "restaurantes-takeaway", restoCat.id],
  ] as const) {
    expenseCats.push(
      await prisma.category.create({
        data: {
          familyId: family.id,
          name,
          slug,
          kind: "EXPENSE",
          parentId,
          isSystem: true,
          color: "#64748b",
          sortOrder: 100,
        },
      }),
    );
  }

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
        scope: "PERSONAL",
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
        scope: "PERSONAL",
        amountCents: 160000,
        date: daysAgo(19),
        description: "Salário Nina",
      },
      {
        familyId: family.id,
        memberId: memberFilipe.id,
        accountId: contaRevolut.id,
        categoryId: bySlug.venda.id,
        createdById: filipe.id,
        scope: "PERSONAL",
        amountCents: 35000,
        date: daysAgo(8),
        description: "Freelance design",
        notes: "Projeto cliente B2B",
      },
      {
        familyId: family.id,
        memberId: memberFilipe.id,
        accountId: contaRevolut.id,
        categoryId: bySlug.subsidio.id,
        createdById: filipe.id,
        scope: "PERSONAL",
        amountCents: 4200,
        date: daysAgo(3),
        description: "Dividendos ETF",
      },
      {
        familyId: family.id,
        memberId: memberFilipe.id,
        accountId: contaCGD.id,
        categoryId: bySlug["receita-outro"].id,
        createdById: filipe.id,
        scope: "FAMILY",
        amountCents: 5000,
        date: daysAgo(6),
        description: "Reembolso condomínio",
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
    scope?: "PERSONAL" | "FAMILY";
  };

  const expenses: ExpSeed[] = [
    { days: 1, cents: 6780, cat: "supermercado", desc: "Compras semanais", store: "Continente", method: "DEBIT_CARD", member: "a", scope: "FAMILY" },
    { days: 2, cents: 4520, cat: "combustivel", desc: "Gasóleo", store: "Galp", method: "MB_WAY", member: "f", time: "08:15", scope: "FAMILY" },
    { days: 3, cents: 2890, cat: "restaurantes", desc: "Almoço equipa", store: "Mercado da Ribeira", method: "REVOLUT", member: "f", account: "rev", scope: "PERSONAL" },
    { days: 4, cents: 1599, cat: "internet", desc: "NOS Fibra", store: "NOS", method: "DIRECT_DEBIT", member: "f", scope: "FAMILY" },
    { days: 5, cents: 3200, cat: "luz", desc: "Fatura EDP", store: "EDP", method: "DIRECT_DEBIT", scope: "FAMILY" },
    { days: 6, cents: 1840, cat: "agua", desc: "Águas de Lisboa", store: "EPAL", method: "DIRECT_DEBIT", scope: "FAMILY" },
    { days: 7, cents: 5400, cat: "supermercado", desc: "Pingo Doce", store: "Pingo Doce", method: "DEBIT_CARD", member: "a", scope: "FAMILY" },
    { days: 8, cents: 1299, cat: "lazer", desc: "Netflix", store: "Netflix", method: "CREDIT_CARD", scope: "FAMILY" },
    { days: 9, cents: 999, cat: "lazer", desc: "Spotify Family", store: "Spotify", method: "CREDIT_CARD", scope: "FAMILY" },
    { days: 10, cents: 8500, cat: "saude", desc: "Consulta dentista", store: "Clínica Saúde", method: "MB_WAY", member: "a", scope: "PERSONAL" },
    { days: 11, cents: 2100, cat: "farmacia", desc: "Medicamentos", store: "Farmácia Central", method: "MB_WAY", member: "a", scope: "FAMILY" },
    { days: 12, cents: 35000, cat: "casa", desc: "Renda", store: "Senhorio", method: "TRANSFER", member: "f", scope: "FAMILY" },
    { days: 13, cents: 4200, cat: "telemoveis", desc: "Vodafone + MEO", store: "Operadoras", method: "DIRECT_DEBIT", scope: "FAMILY" },
    { days: 14, cents: 1890, cat: "transportes", desc: "Via Verde", store: "Via Verde", method: "DIRECT_DEBIT", scope: "FAMILY" },
    { days: 15, cents: 6700, cat: "roupa", desc: "Roupa crianças", store: "Zara", method: "DEBIT_CARD", member: "a", scope: "FAMILY" },
    { days: 16, cents: 3100, cat: "animais", desc: "Ração + vet", store: "Pet Food", method: "DEBIT_CARD", scope: "FAMILY" },
    { days: 17, cents: 5500, cat: "lazer", desc: "Cinema + jantar", store: "NOS Cinemas", method: "REVOLUT", account: "rev", member: "f", scope: "FAMILY" },
    { days: 18, cents: 2800, cat: "carregamentos-eletricos", desc: "Supercharger", store: "Tesla", method: "CREDIT_CARD", member: "f", scope: "PERSONAL" },
    { days: 1, cents: 220, cat: "restaurantes", desc: "Café", store: "Café", method: "MB_WAY", member: "f", scope: "PERSONAL" },
    { days: 3, cents: 150, cat: "restaurantes", desc: "Café", store: "Café", method: "CASH", member: "f", scope: "PERSONAL" },
    { days: 5, cents: 180, cat: "restaurantes", desc: "Café", store: "Café", method: "MB_WAY", member: "f", scope: "PERSONAL" },
  ];

  for (const e of expenses) {
    await prisma.expense.create({
      data: {
        familyId: family.id,
        memberId: e.member === "a" ? memberAna.id : memberFilipe.id,
        accountId: e.account === "rev" ? contaRevolut.id : contaCGD.id,
        categoryId: bySlug[e.cat].id,
        createdById: e.member === "a" ? ana.id : filipe.id,
        scope: e.scope ?? "FAMILY",
        amountCents: e.cents,
        date: daysAgo(e.days),
        time: e.time ?? "12:30",
        description: e.desc,
        storeName: e.store,
        paymentMethod: e.method ?? "DEBIT_CARD",
      },
    });
  }

  // Faturas de exemplo (OCR / arquivo)
  await prisma.expense.create({
    data: {
      familyId: family.id,
      memberId: memberFilipe.id,
      accountId: contaCGD.id,
      categoryId: bySlug.luz.id,
      createdById: filipe.id,
      scope: "FAMILY",
      amountCents: 4875,
      vatCents: 892,
      date: daysAgo(2),
      time: "09:10",
      description: "Fatura EDP — julho",
      storeName: "EDP",
      paymentMethod: "DIRECT_DEBIT",
      receiptImageUrl: "/api/uploads/demo/fatura-edp.jpg",
      ocrRawJson: JSON.stringify({
        storeName: "EDP",
        totalCents: 4875,
        vatCents: 892,
        confidence: 0.94,
        items: [{ name: "Eletricidade", quantity: 1, unitCents: 4875, totalCents: 4875, vatRate: 23 }],
      }),
      notes: "Fatura de exemplo · OCR demo",
      lineItems: {
        create: [
          { name: "Consumo kWh", quantity: 1, unitCents: 3983, totalCents: 3983, vatRate: 23 },
          { name: "Taxas", quantity: 1, unitCents: 892, totalCents: 892, vatRate: 23 },
        ],
      },
    },
  });

  await prisma.expense.create({
    data: {
      familyId: family.id,
      memberId: memberAna.id,
      accountId: contaCGD.id,
      categoryId: bySlug.supermercado.id,
      subcategoryId: bySlug["supermercado-frescos"]?.id,
      createdById: ana.id,
      scope: "FAMILY",
      amountCents: 3245,
      vatCents: 456,
      date: daysAgo(0),
      time: "18:40",
      description: "Talão Continente",
      storeName: "Continente",
      paymentMethod: "DEBIT_CARD",
      receiptImageUrl: "/api/uploads/demo/talao-continente.jpg",
      ocrRawJson: JSON.stringify({
        storeName: "Continente",
        totalCents: 3245,
        vatCents: 456,
        confidence: 0.91,
      }),
      notes: "Talão de exemplo · Captura Instantânea",
      lineItems: {
        create: [
          { name: "Leite meio-gordo", quantity: 2, unitCents: 89, totalCents: 178, vatRate: 6 },
          { name: "Pão de forma", quantity: 1, unitCents: 159, totalCents: 159, vatRate: 6 },
          { name: "Fruta sortida", quantity: 1, unitCents: 450, totalCents: 450, vatRate: 6 },
        ],
      },
    },
  });

  // Lista de compras preenchida (apenas modo Demo)
  const demoList = await prisma.shoppingList.create({
    data: {
      familyId: family.id,
      createdById: filipe.id,
      name: "Lista de compras",
      isShared: true,
    },
  });
  const shopping = [
    ["Leite meio-gordo", "2L", "supermercado"],
    ["Pão de forma", "1", "supermercado"],
    ["Ovos (dúzia)", "1", "supermercado"],
    ["Detergente loiça", "1", "casa"],
    ["Café moído", "250g", "supermercado"],
    ["Fruta da época", "1kg", "supermercado"],
    ["Papel higiénico", "1 pack", "casa"],
    ["Ração cão", "2kg", "animais"],
  ] as const;
  for (let i = 0; i < shopping.length; i++) {
    const [name, quantity, categorySlug] = shopping[i];
    await prisma.shoppingListItem.create({
      data: {
        familyId: family.id,
        listId: demoList.id,
        createdById: i % 2 === 0 ? filipe.id : ana.id,
        name,
        quantity,
        categorySlug,
        sortOrder: i,
        isChecked: i >= 6,
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
  const goals: {
    name: string;
    type: GoalType;
    target: number;
    current: number;
    days: number;
    priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    description?: string;
    items?: { name: string; amount: number }[];
  }[] = [
    {
      name: "Férias Algarve",
      type: "VACATION",
      target: 154000,
      current: 93000,
      days: 90,
      priority: "HIGH",
      description: "Semana em família no Algarve",
      items: [
        { name: "Hotel", amount: 70000 },
        { name: "Alimentação", amount: 30000 },
        { name: "Combustível", amount: 15000 },
        { name: "Portagens", amount: 4000 },
        { name: "Atividades", amount: 25000 },
        { name: "Fundo para imprevistos", amount: 10000 },
      ],
    },
    {
      name: "Remodelar a cozinha",
      type: "HOUSE",
      target: 450000,
      current: 120000,
      days: 240,
      priority: "MEDIUM",
      description: "Bancada, eletrodomésticos e pintura",
    },
    { name: "Entrada carro", type: "CAR", target: 800000, current: 210000, days: 180, priority: "HIGH" },
  ];

  const createdGoals: { id: string; name: string }[] = [];
  for (const g of goals) {
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + g.days);
    const targetCents = g.items?.reduce((s, it) => s + it.amount, 0) ?? g.target;
    const goal = await prisma.savingsGoal.create({
      data: {
        familyId: family.id,
        scope: "FAMILY",
        accountKind: "FAMILY",
        name: g.name,
        description: g.description,
        type: g.type,
        priority: g.priority ?? "MEDIUM",
        targetCents,
        currentCents: g.current,
        deadline,
        color: "#0f7a4a",
        items: g.items
          ? {
              create: g.items.map((it, i) => ({
                name: it.name,
                amountCents: it.amount,
                sortOrder: i,
              })),
            }
          : undefined,
      },
    });
    createdGoals.push({ id: goal.id, name: goal.name });
  }

  await prisma.savingsGoal.create({
    data: {
      familyId: family.id,
      ownerMemberId: memberFilipe.id,
      scope: "PERSONAL",
      accountKind: "PERSONAL",
      name: "Novo computador",
      description: "Portátil para trabalho",
      type: "CUSTOM",
      priority: "MEDIUM",
      targetCents: 120000,
      currentCents: 45000,
      color: "#1e3a5f",
    },
  });

  // Poupanças + investimentos
  const feriasGoal = createdGoals.find((g) => /ferias/i.test(g.name));
  const investStart = new Date();
  investStart.setMonth(investStart.getMonth() - 8);

  await prisma.savingPot.create({
    data: {
      familyId: family.id,
      scope: "FAMILY",
      accountKind: "FAMILY",
      name: "Fundo de Emergência",
      kind: "EMERGENCY",
      targetCents: 500000,
      currentCents: 350000,
      deadline: new Date(Date.now() + 365 * 86400000),
      notes: "3 a 6 meses de despesas essenciais",
      isInvested: true,
      investmentVehicle: "INTEREST_ACCOUNT",
      investedCapitalCents: 350000,
      annualRatePercent: 2.5,
      capitalization: "COMPOUND",
      interestPeriod: "MONTHLY",
      investmentStartDate: investStart,
    },
  });

  await prisma.savingPot.create({
    data: {
      familyId: family.id,
      scope: "FAMILY",
      accountKind: "FAMILY",
      name: "Férias",
      kind: "VACATION",
      targetCents: 154000,
      currentCents: 93000,
      linkedGoalId: feriasGoal?.id,
      deadline: new Date(Date.now() + 90 * 86400000),
      notes: "Ligada ao objetivo Férias Algarve",
    },
  });

  await prisma.savingPot.create({
    data: {
      familyId: family.id,
      scope: "FAMILY",
      accountKind: "FAMILY",
      name: "Entrada para Casa",
      kind: "HOUSE",
      targetCents: 2000000,
      currentCents: 480000,
      isInvested: true,
      investmentVehicle: "ETF",
      investedCapitalCents: 480000,
      annualRatePercent: 6.5,
      capitalization: "COMPOUND",
      interestPeriod: "YEARLY",
      investmentStartDate: investStart,
      notes: "ETF global diversificado",
    },
  });

  await prisma.savingPot.create({
    data: {
      familyId: family.id,
      ownerMemberId: memberFilipe.id,
      scope: "PERSONAL",
      accountKind: "BUSINESS",
      name: "Reserva Empresa",
      kind: "OTHER",
      targetCents: 300000,
      currentCents: 75000,
      notes: "Conta Empresa — margem de segurança",
    },
  });

  // Convite seguro demo + memória + hábitos
  const inviteExpires = new Date();
  inviteExpires.setDate(inviteExpires.getDate() + 30);
  await prisma.familyInvite.create({
    data: {
      familyId: family.id,
      token: "nina-demo-invite-token-seguro",
      createdById: filipe.id,
      label: "Convite demo",
      expiresAt: inviteExpires,
    },
  });

  await prisma.ninaMemoryRule.createMany({
    data: [
      {
        userId: filipe.id,
        familyId: family.id,
        triggerPhrase: "compras para casa",
        scope: "FAMILY",
      },
      {
        userId: filipe.id,
        familyId: family.id,
        triggerPhrase: "tvde",
        scope: "PERSONAL",
        categorySlug: "tvde",
      },
    ],
  });

  await prisma.ninaHabitStat.createMany({
    data: [
      {
        userId: filipe.id,
        familyId: family.id,
        keyType: "store",
        keyValue: "continente",
        personalCount: 0,
        familyCount: 4,
        lastScope: "FAMILY",
      },
      {
        userId: filipe.id,
        familyId: family.id,
        keyType: "store",
        keyValue: "café",
        personalCount: 5,
        familyCount: 0,
        lastScope: "PERSONAL",
      },
    ],
  });

  // Ligações demo — só as que o utilizador autorizou
  await prisma.ninaConnection.createMany({
    data: [
      {
        familyId: family.id,
        userId: filipe.id,
        providerKey: "gmail",
        label: "Gmail",
        kind: "EMAIL",
        status: "AUTHORIZED",
        autoImport: true,
        importProvider: "EMAIL",
        lastMessage: "Autorizado — a Nina pode ler faturas neste email.",
      },
      {
        familyId: family.id,
        userId: filipe.id,
        providerKey: "continente",
        label: "Continente",
        kind: "RETAIL",
        status: "AUTHORIZED",
        autoImport: true,
        importProvider: "CONTINENTE",
        lastMessage: "Autorizado — importação de compras pronta.",
      },
      {
        familyId: family.id,
        userId: filipe.id,
        providerKey: "via_verde",
        label: "Via Verde",
        kind: "AUTO",
        status: "AUTHORIZED",
        autoImport: false,
        importProvider: "VIA_VERDE",
        lastMessage: "Autorizado, auto-import desligado.",
      },
    ],
  });

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
        title: "Restaurantes a precisar de atenção",
        message:
          "Os restaurantes pesaram um pouco mais este mês (cerca de 75% do plano). Vamos tentar equilibrar nas próximas semanas — sem stress.",
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
      {
        familyId: family.id,
        userId: ana.id,
        type: "CUSTOM",
        title: "Lista de compras pronta",
        message: "Há 6 artigos por comprar na lista familiar.",
        level: "info",
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

  console.log("✅ Demo Nina pronta");
  console.log("   Filipe: familia@nina.app / " + DEMO_PASSWORD);
  console.log("   Nina:   nina@nina.app / " + DEMO_PASSWORD);
  console.log("   Convite: /pt/convite/nina-demo-invite-token-seguro");
  console.log("   Abre: http://localhost:3000/pt/login");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
