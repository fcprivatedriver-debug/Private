"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireFamilyContext } from "@/lib/session";
import { parseEURInput } from "@/lib/money";
import { slugify } from "@/lib/utils";
import {
  incomeSchema,
  expenseSchema,
  budgetSchema,
  goalSchema,
  recurringSchema,
  categorySchema,
  registerSchema,
} from "@/lib/validators";
import bcrypt from "bcryptjs";
import { recognizeReceipt } from "@/lib/ocr";
import { getImportAdapter } from "@/lib/imports";
import { generateInsights, buildMonthlyReport } from "@/lib/ai/finance-insights";
import { toCSV, toExcelTSV, toSimplePdfText } from "@/lib/export";
import type { ImportProvider, PaymentMethod } from "@prisma/client";
import { currentYearMonth, monthBounds } from "@/lib/money";
import { makeInviteCode } from "@/domain/household";
import {
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
} from "@/domain/categories";

function revalidateApp() {
  revalidatePath("/", "layout");
}

export async function registerFamily(formData: FormData) {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    familyName: formData.get("familyName") || undefined,
  });
  if (!parsed.success) return { ok: false as const, error: "Dados inválidos" };

  const email = parsed.data.email.toLowerCase();
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return { ok: false as const, error: "Email já registado" };

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email,
      passwordHash,
    },
  });

  const family = await prisma.family.create({
    data: {
      name: parsed.data.familyName || `Família ${parsed.data.name.split(" ")[0]}`,
      kind: "FAMILY",
      inviteCode: makeInviteCode(),
    },
  });

  await prisma.familyMember.create({
    data: {
      familyId: family.id,
      userId: user.id,
      displayName: parsed.data.name.split(" ")[0],
      role: "OWNER",
    },
  });

  await prisma.financeAccount.create({
    data: {
      familyId: family.id,
      name: "Conta principal",
      type: "CHECKING",
    },
  });

  for (let i = 0; i < DEFAULT_EXPENSE_CATEGORIES.length; i++) {
    const c = DEFAULT_EXPENSE_CATEGORIES[i];
    await prisma.category.create({
      data: {
        familyId: family.id,
        name: c.name,
        slug: c.slug,
        icon: c.icon,
        color: c.color,
        kind: "EXPENSE",
        isSystem: true,
        sortOrder: i,
      },
    });
  }
  for (let i = 0; i < DEFAULT_INCOME_CATEGORIES.length; i++) {
    const c = DEFAULT_INCOME_CATEGORIES[i];
    await prisma.category.create({
      data: {
        familyId: family.id,
        name: c.name,
        slug: c.slug,
        icon: c.icon,
        color: c.color,
        kind: "INCOME",
        isSystem: true,
        sortOrder: i,
      },
    });
  }

  return { ok: true as const };
}

export async function createIncome(formData: FormData) {
  const { session, family, membership } = await requireFamilyContext();
  const parsed = incomeSchema.safeParse({
    amount: formData.get("amount"),
    date: formData.get("date"),
    description: formData.get("description"),
    categoryId: formData.get("categoryId"),
    accountId: formData.get("accountId") || null,
    notes: formData.get("notes") || null,
    memberId: formData.get("memberId") || membership.id,
  });
  if (!parsed.success) return { ok: false as const, error: "Dados inválidos" };
  const amountCents = parseEURInput(parsed.data.amount);
  if (amountCents == null || amountCents <= 0) return { ok: false as const, error: "Valor inválido" };

  await prisma.income.create({
    data: {
      familyId: family.id,
      categoryId: parsed.data.categoryId,
      accountId: parsed.data.accountId || null,
      memberId: parsed.data.memberId || membership.id,
      createdById: session.user.id,
      amountCents,
      date: new Date(parsed.data.date),
      description: parsed.data.description,
      notes: parsed.data.notes || null,
    },
  });
  revalidateApp();
  return { ok: true as const };
}

export async function createExpense(formData: FormData) {
  const { session, family, membership } = await requireFamilyContext();
  const parsed = expenseSchema.safeParse({
    amount: formData.get("amount"),
    date: formData.get("date"),
    time: formData.get("time") || null,
    description: formData.get("description"),
    categoryId: formData.get("categoryId"),
    subcategoryId: formData.get("subcategoryId") || null,
    storeName: formData.get("storeName") || null,
    paymentMethod: formData.get("paymentMethod") || "DEBIT_CARD",
    accountId: formData.get("accountId") || null,
    notes: formData.get("notes") || null,
    memberId: formData.get("memberId") || membership.id,
    receiptImageUrl: formData.get("receiptImageUrl") || null,
    receiptPdfUrl: formData.get("receiptPdfUrl") || null,
  });
  if (!parsed.success) return { ok: false as const, error: "Dados inválidos" };
  const amountCents = parseEURInput(parsed.data.amount);
  if (amountCents == null || amountCents <= 0) return { ok: false as const, error: "Valor inválido" };

  let storeId: string | undefined;
  if (parsed.data.storeName) {
    const normalized = parsed.data.storeName.trim().toLowerCase();
    const store = await prisma.store.upsert({
      where: {
        familyId_normalizedName: { familyId: family.id, normalizedName: normalized },
      },
      create: {
        familyId: family.id,
        name: parsed.data.storeName.trim(),
        normalizedName: normalized,
      },
      update: {},
    });
    storeId = store.id;
  }

  await prisma.expense.create({
    data: {
      familyId: family.id,
      categoryId: parsed.data.categoryId,
      subcategoryId: parsed.data.subcategoryId || null,
      accountId: parsed.data.accountId || null,
      memberId: parsed.data.memberId || membership.id,
      createdById: session.user.id,
      storeId,
      amountCents,
      date: new Date(parsed.data.date),
      time: parsed.data.time || null,
      description: parsed.data.description,
      storeName: parsed.data.storeName || null,
      paymentMethod: parsed.data.paymentMethod as PaymentMethod,
      notes: parsed.data.notes || null,
      receiptImageUrl: parsed.data.receiptImageUrl || null,
      receiptPdfUrl: parsed.data.receiptPdfUrl || null,
    },
  });
  revalidateApp();
  return { ok: true as const };
}

export async function createBudget(formData: FormData) {
  const { family } = await requireFamilyContext();
  const parsed = budgetSchema.safeParse({
    categoryId: formData.get("categoryId"),
    limit: formData.get("limit"),
    year: formData.get("year"),
    month: formData.get("month"),
  });
  if (!parsed.success) return { ok: false as const, error: "Dados inválidos" };
  const limitCents = parseEURInput(parsed.data.limit);
  if (limitCents == null || limitCents <= 0) return { ok: false as const, error: "Valor inválido" };

  await prisma.budget.upsert({
    where: {
      familyId_categoryId_year_month: {
        familyId: family.id,
        categoryId: parsed.data.categoryId,
        year: parsed.data.year,
        month: parsed.data.month,
      },
    },
    create: {
      familyId: family.id,
      categoryId: parsed.data.categoryId,
      year: parsed.data.year,
      month: parsed.data.month,
      limitCents,
    },
    update: { limitCents },
  });
  revalidateApp();
  return { ok: true as const };
}

export async function createGoal(formData: FormData) {
  const { family } = await requireFamilyContext();
  const parsed = goalSchema.safeParse({
    name: formData.get("name"),
    type: formData.get("type") || "CUSTOM",
    target: formData.get("target"),
    current: formData.get("current") || "0",
    deadline: formData.get("deadline") || null,
    notes: formData.get("notes") || null,
  });
  if (!parsed.success) return { ok: false as const, error: "Dados inválidos" };
  const targetCents = parseEURInput(parsed.data.target);
  const currentCents = parseEURInput(parsed.data.current || "0") ?? 0;
  if (targetCents == null || targetCents <= 0) return { ok: false as const, error: "Meta inválida" };

  await prisma.savingsGoal.create({
    data: {
      familyId: family.id,
      name: parsed.data.name,
      type: parsed.data.type,
      targetCents,
      currentCents,
      deadline: parsed.data.deadline ? new Date(parsed.data.deadline) : null,
      notes: parsed.data.notes || null,
    },
  });
  revalidateApp();
  return { ok: true as const };
}

export async function contributeToGoal(goalId: string, amountRaw: string) {
  const { family } = await requireFamilyContext();
  const cents = parseEURInput(amountRaw);
  if (cents == null || cents <= 0) return { ok: false as const, error: "Valor inválido" };
  const goal = await prisma.savingsGoal.findFirst({ where: { id: goalId, familyId: family.id } });
  if (!goal) return { ok: false as const, error: "Objetivo não encontrado" };
  const currentCents = goal.currentCents + cents;
  await prisma.savingsGoal.update({
    where: { id: goalId },
    data: {
      currentCents,
      isCompleted: currentCents >= goal.targetCents,
    },
  });
  revalidateApp();
  return { ok: true as const };
}

export async function createRecurring(formData: FormData) {
  const { family } = await requireFamilyContext();
  const parsed = recurringSchema.safeParse({
    name: formData.get("name"),
    amount: formData.get("amount"),
    categoryId: formData.get("categoryId"),
    frequency: formData.get("frequency") || "MONTHLY",
    dayOfMonth: formData.get("dayOfMonth") || null,
    nextDueDate: formData.get("nextDueDate"),
    paymentMethod: formData.get("paymentMethod") || "DIRECT_DEBIT",
    accountId: formData.get("accountId") || null,
    notes: formData.get("notes") || null,
  });
  if (!parsed.success) return { ok: false as const, error: "Dados inválidos" };
  const amountCents = parseEURInput(parsed.data.amount);
  if (amountCents == null || amountCents <= 0) return { ok: false as const, error: "Valor inválido" };

  await prisma.recurringPayment.create({
    data: {
      familyId: family.id,
      name: parsed.data.name,
      amountCents,
      categoryId: parsed.data.categoryId,
      frequency: parsed.data.frequency,
      dayOfMonth: parsed.data.dayOfMonth || null,
      nextDueDate: new Date(parsed.data.nextDueDate),
      paymentMethod: parsed.data.paymentMethod as PaymentMethod,
      accountId: parsed.data.accountId || null,
      notes: parsed.data.notes || null,
    },
  });
  revalidateApp();
  return { ok: true as const };
}

export async function createCategory(formData: FormData) {
  const { family } = await requireFamilyContext();
  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    kind: formData.get("kind") || "EXPENSE",
    color: formData.get("color") || "#64748b",
    parentId: formData.get("parentId") || null,
  });
  if (!parsed.success) return { ok: false as const, error: "Dados inválidos" };

  let slug = slugify(parsed.data.name);
  const existing = await prisma.category.findUnique({
    where: { familyId_slug: { familyId: family.id, slug } },
  });
  if (existing) slug = `${slug}-${Date.now().toString(36)}`;

  await prisma.category.create({
    data: {
      familyId: family.id,
      name: parsed.data.name,
      slug,
      kind: parsed.data.kind,
      color: parsed.data.color || "#64748b",
      parentId: parsed.data.parentId || null,
      isSystem: false,
    },
  });
  revalidateApp();
  return { ok: true as const };
}

export async function markAlertRead(alertId: string) {
  const { family } = await requireFamilyContext();
  await prisma.alert.updateMany({
    where: { id: alertId, familyId: family.id },
    data: { isRead: true },
  });
  revalidateApp();
  return { ok: true as const };
}

export async function runOcrPreview(fileName: string) {
  await requireFamilyContext();
  const result = await recognizeReceipt({ fileName });
  return { ok: true as const, result };
}

export async function confirmOcrExpense(input: {
  storeName: string;
  date: string;
  totalCents: number;
  vatCents: number;
  categoryId: string;
  description: string;
  paymentMethod: PaymentMethod;
  accountId?: string | null;
  items?: { name: string; quantity: number; unitCents: number; totalCents: number; vatRate?: number }[];
}) {
  const { session, family, membership } = await requireFamilyContext();
  let storeId: string | undefined;
  if (input.storeName) {
    const normalized = input.storeName.trim().toLowerCase();
    const store = await prisma.store.upsert({
      where: { familyId_normalizedName: { familyId: family.id, normalizedName: normalized } },
      create: { familyId: family.id, name: input.storeName.trim(), normalizedName: normalized },
      update: {},
    });
    storeId = store.id;
  }

  const expense = await prisma.expense.create({
    data: {
      familyId: family.id,
      memberId: membership.id,
      createdById: session.user.id,
      categoryId: input.categoryId,
      accountId: input.accountId || null,
      storeId,
      amountCents: input.totalCents,
      vatCents: input.vatCents,
      date: new Date(input.date),
      description: input.description,
      storeName: input.storeName,
      paymentMethod: input.paymentMethod,
      ocrRawJson: JSON.stringify(input),
      lineItems: input.items?.length
        ? {
            create: input.items.map((i) => ({
              name: i.name,
              quantity: i.quantity,
              unitCents: i.unitCents,
              totalCents: i.totalCents,
              vatRate: i.vatRate,
            })),
          }
        : undefined,
    },
  });
  revalidateApp();
  return { ok: true as const, id: expense.id };
}

export async function startImport(provider: ImportProvider) {
  const { family } = await requireFamilyContext();
  const adapter = getImportAdapter(provider);
  if (!adapter) return { ok: false as const, error: "Provider não suportado" };

  const job = await prisma.importJob.create({
    data: {
      familyId: family.id,
      provider,
      status: "PROCESSING",
      sourceLabel: adapter.label,
    },
  });

  let drafts: import("@/lib/imports").ImportedExpenseDraft[] = [];
  if (adapter.fetchRecent) drafts = await adapter.fetchRecent();
  else if (adapter.connect) await adapter.connect();

  await prisma.importJob.update({
    where: { id: job.id },
    data: {
      status: drafts.length ? "READY_REVIEW" : "PENDING",
      parsedJson: JSON.stringify(drafts),
    },
  });

  revalidateApp();
  return { ok: true as const, jobId: job.id, drafts };
}

export async function importCsvContent(content: string, fileName: string) {
  const { family } = await requireFamilyContext();
  const adapter = getImportAdapter("CSV");
  const drafts = (await adapter?.parseFile?.(content, fileName)) ?? [];
  const job = await prisma.importJob.create({
    data: {
      familyId: family.id,
      provider: "CSV",
      status: "READY_REVIEW",
      sourceLabel: fileName,
      parsedJson: JSON.stringify(drafts),
    },
  });
  revalidateApp();
  return { ok: true as const, jobId: job.id, drafts };
}

export async function confirmImportJob(jobId: string) {
  const { session, family, membership } = await requireFamilyContext();
  const job = await prisma.importJob.findFirst({ where: { id: jobId, familyId: family.id } });
  if (!job?.parsedJson) return { ok: false as const, error: "Importação inválida" };

  const drafts = JSON.parse(job.parsedJson) as {
    amountCents: number;
    date: string;
    description: string;
    storeName?: string;
    categorySlug?: string;
    paymentMethod?: string;
  }[];

  const categories = await prisma.category.findMany({ where: { familyId: family.id } });
  const bySlug = Object.fromEntries(categories.map((c) => [c.slug, c]));
  const fallback = categories.find((c) => c.slug === "outros") ?? categories[0];

  for (const d of drafts) {
    const cat = (d.categorySlug && bySlug[d.categorySlug]) || fallback;
    await prisma.expense.create({
      data: {
        familyId: family.id,
        memberId: membership.id,
        createdById: session.user.id,
        categoryId: cat.id,
        amountCents: d.amountCents,
        date: new Date(d.date),
        description: d.description,
        storeName: d.storeName,
        paymentMethod: (d.paymentMethod as PaymentMethod) || "OTHER",
        importJobId: job.id,
      },
    });
  }

  await prisma.importJob.update({
    where: { id: job.id },
    data: { status: "IMPORTED" },
  });
  revalidateApp();
  return { ok: true as const, count: drafts.length };
}

export async function refreshAiInsights() {
  const { session, family } = await requireFamilyContext();
  const { year, month } = currentYearMonth();
  const { start, end } = monthBounds(year, month);
  const prev = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  const prevBounds = monthBounds(prev.year, prev.month);

  const [incomes, expenses, prevExpenses, budgets] = await Promise.all([
    prisma.income.findMany({ where: { familyId: family.id, date: { gte: start, lte: end } } }),
    prisma.expense.findMany({
      where: { familyId: family.id, date: { gte: start, lte: end } },
      include: { category: true },
    }),
    prisma.expense.findMany({ where: { familyId: family.id, date: { gte: prevBounds.start, lte: prevBounds.end } } }),
    prisma.budget.findMany({ where: { familyId: family.id, year, month } }),
  ]);

  const incomeCents = incomes.reduce((s, i) => s + i.amountCents, 0);
  const expenseCents = expenses.reduce((s, i) => s + i.amountCents, 0);
  const prevExpenseCents = prevExpenses.reduce((s, i) => s + i.amountCents, 0);
  const budgetLimit = budgets.reduce((s, b) => s + b.limitCents, 0);

  const catMap = new Map<string, number>();
  for (const e of expenses) {
    catMap.set(e.category.name, (catMap.get(e.category.name) ?? 0) + e.amountCents);
  }
  const categoryBreakdown = [...catMap.entries()]
    .map(([name, cents]) => ({ name, cents }))
    .sort((a, b) => b.cents - a.cents);

  const byDesc = new Map<string, number[]>();
  for (const e of [...expenses, ...prevExpenses]) {
    const arr = byDesc.get(e.description) ?? [];
    arr.push(e.amountCents);
    byDesc.set(e.description, arr);
  }
  const unusualExpenses = expenses
    .map((e) => {
      const arr = byDesc.get(e.description) ?? [e.amountCents];
      const avg = Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
      return { description: e.description, amountCents: e.amountCents, avgCents: avg };
    })
    .filter((u) => u.amountCents > u.avgCents * 1.5)
    .slice(0, 5);

  const daysLeft = Math.max(0, end.getUTCDate() - new Date().getDate());
  const insights = generateInsights({
    incomeCents,
    expenseCents,
    prevExpenseCents,
    categoryBreakdown,
    unusualExpenses,
    budgetUsedPercent: budgetLimit > 0 ? Math.round((expenseCents / budgetLimit) * 1000) / 10 : 0,
    daysLeftInMonth: daysLeft,
  });

  await prisma.aiInsight.deleteMany({ where: { familyId: family.id } });
  await prisma.aiInsight.createMany({
    data: insights.map((i) => ({
      familyId: family.id,
      userId: session.user.id,
      kind: i.kind,
      title: i.title,
      body: i.body,
      severity: i.severity,
    })),
  });

  const report = buildMonthlyReport({
    incomeCents,
    expenseCents,
    prevExpenseCents,
    categoryBreakdown,
    unusualExpenses,
    budgetUsedPercent: 0,
    daysLeftInMonth: daysLeft,
  });

  revalidateApp();
  return { ok: true as const, insights, report };
}

export async function exportFamilyData(format: "csv" | "excel" | "pdf") {
  const { family } = await requireFamilyContext();
  const expenses = await prisma.expense.findMany({
    where: { familyId: family.id },
    include: { category: true, account: true, member: true },
    orderBy: { date: "desc" },
    take: 2000,
  });
  const incomes = await prisma.income.findMany({
    where: { familyId: family.id },
    include: { category: true },
    orderBy: { date: "desc" },
    take: 2000,
  });

  const rows = [
    ...incomes.map((i) => ({
      tipo: "Receita",
      data: i.date.toISOString().slice(0, 10),
      descricao: i.description,
      categoria: i.category.name,
      loja: "",
      metodo: "",
      valor: (i.amountCents / 100).toFixed(2),
    })),
    ...expenses.map((e) => ({
      tipo: "Despesa",
      data: e.date.toISOString().slice(0, 10),
      descricao: e.description,
      categoria: e.category.name,
      loja: e.storeName ?? "",
      metodo: e.paymentMethod,
      valor: (-e.amountCents / 100).toFixed(2),
    })),
  ];

  const columns = [
    { key: "tipo", header: "Tipo" },
    { key: "data", header: "Data" },
    { key: "descricao", header: "Descrição" },
    { key: "categoria", header: "Categoria" },
    { key: "loja", header: "Loja" },
    { key: "metodo", header: "Método" },
    { key: "valor", header: "Valor EUR" },
  ];

  if (format === "csv") {
    return { ok: true as const, filename: "nina-export.csv", content: toCSV(rows, columns), mime: "text/csv;charset=utf-8" };
  }
  if (format === "excel") {
    return { ok: true as const, filename: "nina-export.xls", content: toExcelTSV(rows, columns), mime: "application/vnd.ms-excel" };
  }
  const pdf = toSimplePdfText(
    "Nina Export",
    rows.slice(0, 40).map((r) => `${r.data} ${r.tipo} ${r.descricao} ${r.valor}€`),
  );
  return { ok: true as const, filename: "nina-export.pdf", content: pdf, mime: "application/pdf" };
}

export async function updateTheme(theme: "light" | "dark" | "system") {
  const { session } = await requireFamilyContext();
  await prisma.user.update({
    where: { id: session.user.id },
    data: { theme },
  });
  revalidateApp();
  return { ok: true as const };
}

export async function addFamilyMember(formData: FormData) {
  const { family, membership } = await requireFamilyContext();
  if (membership.role !== "OWNER" && membership.role !== "ADMIN") {
    return { ok: false as const, error: "Sem permissão" };
  }
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "nina123");
  if (!name || !email) return { ok: false as const, error: "Nome e email obrigatórios" };

  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: await bcrypt.hash(password, 10),
      },
    });
  }

  await prisma.familyMember.upsert({
    where: { familyId_userId: { familyId: family.id, userId: user.id } },
    create: {
      familyId: family.id,
      userId: user.id,
      displayName: name.split(" ")[0],
      role: "MEMBER",
    },
    update: { displayName: name.split(" ")[0] },
  });
  revalidateApp();
  return { ok: true as const };
}
