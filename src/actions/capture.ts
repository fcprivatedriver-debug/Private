"use server";

import { revalidatePath } from "next/cache";
import { requireFamilyContext } from "@/lib/session";
import { prisma } from "@/lib/db";
import { parseMoneyIntent } from "@/lib/ai/parse-intent";
import { resolveScope, learnScopeHabit } from "@/lib/ai/learning";
import { getNinaSpace } from "@/actions/household";
import { applySavingsTransfer } from "@/lib/savings-transfer";
import { recognizeReceipt } from "@/lib/ocr";
import { storeFamilyFile } from "@/lib/storage";
import { formatEUR } from "@/lib/money";
import { canEditFinances } from "@/domain/household";
import { inferHumorKind, lightHumor, pickWarmAck } from "@/lib/ai/personality";
import {
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
} from "@/domain/categories";
import { slugify } from "@/lib/utils";
import type { FinanceScope, PaymentMethod } from "@prisma/client";

function revalidateAll() {
  revalidatePath("/", "layout");
}

async function resolveCategoryId(
  familyId: string,
  slugHint: string | undefined,
  kind: "EXPENSE" | "INCOME",
) {
  const presets = kind === "INCOME" ? DEFAULT_INCOME_CATEGORIES : DEFAULT_EXPENSE_CATEGORIES;
  const hint = (slugHint || "").toLowerCase();
  const preset =
    presets.find(
      (c) =>
        c.slug === hint ||
        c.name.toLowerCase() === hint ||
        (hint && c.name.toLowerCase().includes(hint)) ||
        (hint && c.slug.includes(hint)),
    ) ||
    presets.find((c) => c.slug.includes("outro")) ||
    presets[presets.length - 1];

  const slug = preset?.slug || slugify(hint || "outros") || "outros";
  const name = preset?.name || (hint ? hint : "Outros");

  const existing = await prisma.category.findFirst({
    where: {
      familyId,
      kind,
      OR: [
        { slug },
        ...(hint ? [{ slug: { contains: hint } }, { name: { contains: hint, mode: "insensitive" as const } }] : []),
      ],
    },
  });
  if (existing) return existing;

  return prisma.category.create({
    data: {
      familyId,
      name,
      slug,
      icon: preset?.icon || "tag",
      color: preset?.color || (kind === "INCOME" ? "#0f7a4a" : "#1e3a5f"),
      kind,
      isSystem: Boolean(preset),
      sortOrder: 0,
    },
  });
}

async function spaceFallbackScope(): Promise<FinanceScope> {
  const space = await getNinaSpace();
  return space === "family" ? "FAMILY" : "PERSONAL";
}

function replyForScope(scope: FinanceScope, description?: string) {
  const base =
    scope === "FAMILY"
      ? `${pickWarmAck()} Na Conta Familiar.`
      : `${pickWarmAck()}`;
  const joke = lightHumor(
    inferHumorKind(description || ""),
    { replyLength: "short", humor: "light", source: "auto" },
    false,
  );
  if (joke && Date.now() % 3 !== 0) return `${base} ${joke}`;
  return base.endsWith(".") ? base : `${base}.`;
}

/**
 * Captura Instantânea por voz/texto — registo em segundos, sem formulários.
 * Não faz perguntas de confirmação: usa contexto, hábitos ou o espaço atual.
 */
export async function instantCaptureSpeak(utterance: string) {
  const { session, membership, family } = await requireFamilyContext();
  if (!canEditFinances(membership.role)) {
    return { ok: false as const, error: "Sem permissão para registar." };
  }

  const text = utterance.trim();
  if (!text) return { ok: false as const, error: "Diz o que queres registar." };

  const intent = parseMoneyIntent(text);
  if (!intent) {
    return {
      ok: false as const,
      error: "Não percebi o valor. Ex.: «Supermercado, 35 euros.»",
    };
  }
  if (intent.kind === "need_amount") {
    return { ok: false as const, error: intent.hint };
  }
  if (intent.kind === "memory_rule") {
    return {
      ok: false as const,
      error: "Para regras de memória, usa Conversar ou Memória.",
    };
  }

  const now = new Date();
  const time = now.toTimeString().slice(0, 5);

  if (intent.kind === "income") {
    const cat = await resolveCategoryId(family.id, intent.categoryHint, "INCOME");
    const scope = intent.explicitScope ?? "PERSONAL";
    await prisma.income.create({
      data: {
        familyId: family.id,
        memberId: membership.id,
        createdById: session.user.id,
        categoryId: cat.id,
        scope,
        amountCents: intent.amountCents,
        date: now,
        description: intent.description,
        notes: "Captura Instantânea · voz",
      },
    });
    revalidateAll();
    return {
      ok: true as const,
      reply: replyForScope(scope, intent.description),
      detail: `${formatEUR(intent.amountCents)} · ${cat.name} · ${time}`,
      kind: "income" as const,
      scope,
    };
  }

  if (intent.kind === "save") {
    const transferred = await applySavingsTransfer(family.id, intent.amountCents, intent.goalHint);
    revalidateAll();
    return {
      ok: true as const,
      reply: transferred.ok ? `Registado em ${transferred.targetName}.` : "Registado.",
      detail: `Poupança ${formatEUR(intent.amountCents)}${transferred.ok ? ` · ${transferred.targetName}` : ""}`,
      kind: "save" as const,
      scope: "FAMILY" as const,
    };
  }

  // expense
  const decision = await resolveScope({
    userId: session.user.id,
    familyId: family.id,
    raw: text,
    storeName: intent.storeName,
    categoryHint: intent.categoryHint,
    explicitScope: intent.explicitScope,
  });
  const scope =
    decision.scope && !decision.needsConfirm
      ? decision.scope
      : decision.scope ?? (await spaceFallbackScope());

  const cat = await resolveCategoryId(family.id, intent.categoryHint, "EXPENSE");
  let storeId: string | undefined;
  if (intent.storeName) {
    const normalized = intent.storeName.trim().toLowerCase();
    const store = await prisma.store.upsert({
      where: {
        familyId_normalizedName: { familyId: family.id, normalizedName: normalized },
      },
      create: {
        familyId: family.id,
        name: intent.storeName,
        normalizedName: normalized,
      },
      update: {},
    });
    storeId = store.id;
  }

  const paymentMethod = (intent.paymentHint as PaymentMethod | undefined) ?? "OTHER";

  await prisma.expense.create({
    data: {
      familyId: family.id,
      memberId: membership.id,
      createdById: session.user.id,
      categoryId: cat.id,
      storeId,
      scope,
      amountCents: intent.amountCents,
      date: now,
      time,
      description: intent.description,
      storeName: intent.storeName,
      paymentMethod,
      notes: "Captura Instantânea · voz",
    },
  });

  await learnScopeHabit({
    userId: session.user.id,
    familyId: family.id,
    storeName: intent.storeName,
    categoryHint: intent.categoryHint,
    scope,
  });

  revalidateAll();
  return {
    ok: true as const,
    reply: replyForScope(scope, intent.description || intent.storeName),
    detail: `${formatEUR(intent.amountCents)} · ${cat.name}${intent.storeName ? ` · ${intent.storeName}` : ""} · ${time}`,
    kind: "expense" as const,
    scope,
  };
}

/**
 * Captura Instantânea por fotografia — OCR + arquivo associado ao movimento.
 */
export async function instantCapturePhoto(formData: FormData) {
  const { session, membership, family } = await requireFamilyContext();
  if (!canEditFinances(membership.role)) {
    return { ok: false as const, error: "Sem permissão para registar." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false as const, error: "Escolhe ou tira uma fotografia." };
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const stored = await storeFamilyFile({
    familyId: family.id,
    fileName: file.name || "fatura.jpg",
    mimeType: file.type || "image/jpeg",
    bytes,
  });

  const ocr = await recognizeReceipt({
    fileName: file.name,
    hintText: String(formData.get("hint") || ""),
  });

  const cat = await resolveCategoryId(family.id, ocr.suggestedCategorySlug, "EXPENSE");
  const scope = await spaceFallbackScope();
  const now = new Date();
  const isPdf = (file.type || "").includes("pdf") || /\.pdf$/i.test(file.name);

  let storeId: string | undefined;
  if (ocr.storeName) {
    const normalized = ocr.storeName.trim().toLowerCase();
    const store = await prisma.store.upsert({
      where: {
        familyId_normalizedName: { familyId: family.id, normalizedName: normalized },
      },
      create: { familyId: family.id, name: ocr.storeName, normalizedName: normalized },
      update: {},
    });
    storeId = store.id;
  }

  const expense = await prisma.expense.create({
    data: {
      familyId: family.id,
      memberId: membership.id,
      createdById: session.user.id,
      categoryId: cat.id,
      storeId,
      scope,
      amountCents: ocr.totalCents,
      vatCents: ocr.vatCents,
      date: new Date(ocr.date),
      time: now.toTimeString().slice(0, 5),
      description: ocr.storeName,
      storeName: ocr.storeName,
      paymentMethod: "OTHER",
      receiptImageUrl: isPdf ? null : stored.url,
      receiptPdfUrl: isPdf ? stored.url : null,
      ocrRawJson: JSON.stringify({ ...ocr, storageKey: stored.storageKey }),
      notes: "Captura Instantânea · fotografia",
      lineItems: ocr.items.length
        ? {
            create: ocr.items.map((i) => ({
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

  await learnScopeHabit({
    userId: session.user.id,
    familyId: family.id,
    storeName: ocr.storeName,
    categoryHint: ocr.suggestedCategorySlug,
    scope,
  });

  revalidateAll();
  return {
    ok: true as const,
    reply: replyForScope(scope, ocr.storeName),
    detail: `${formatEUR(ocr.totalCents)} · ${ocr.storeName} · ${cat.name} · foto arquivada`,
    expenseId: expense.id,
    receiptUrl: stored.url,
    confidence: ocr.confidence,
    kind: "expense" as const,
    scope,
  };
}
