"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireFamilyContext } from "@/lib/session";
import { catalogByKey, AUTOMATION_LEVELS } from "@/domain/connections";
import { getImportAdapter, type ImportedExpenseDraft } from "@/lib/imports";
import { extractInvoicesFromAuthorizedEmail } from "@/lib/connections/email";
import { getNinaSpace } from "@/actions/household";
import type { AutomationLevel, ImportProvider, PaymentMethod } from "@prisma/client";

function revalidateAll() {
  revalidatePath("/", "layout");
}

export async function listConnectionsState() {
  const { session, family } = await requireFamilyContext();
  const [connections, user] = await Promise.all([
    prisma.ninaConnection.findMany({
      where: { familyId: family.id },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.user.findUniqueOrThrow({
      where: { id: session.user.id },
      select: { automationLevel: true },
    }),
  ]);
  return {
    ok: true as const,
    connections,
    automationLevel: user.automationLevel,
    levels: AUTOMATION_LEVELS,
  };
}

/** Autorização explícita — a ligação só fica ativa aqui. */
export async function authorizeConnection(providerKey: string) {
  const { session, family } = await requireFamilyContext();
  const item = catalogByKey(providerKey);
  if (!item) return { ok: false as const, error: "Ligação desconhecida." };

  const connectMsg = item.comingSoon
    ? "Arquitetura preparada. A autorização fica registada; a sincronização chega em breve."
    : item.importProvider
      ? (await getImportAdapter(item.importProvider)?.connect?.())?.message ??
        "Ligação autorizada. A Nina pode importar quando quiseres."
      : "Ligação autorizada.";

  const row = await prisma.ninaConnection.upsert({
    where: {
      familyId_providerKey: { familyId: family.id, providerKey },
    },
    create: {
      familyId: family.id,
      userId: session.user.id,
      providerKey,
      label: item.label,
      kind: item.kind,
      status: "AUTHORIZED",
      autoImport: true,
      importProvider: item.importProvider ?? null,
      lastMessage: connectMsg,
      authorizedAt: new Date(),
      revokedAt: null,
    },
    update: {
      status: "AUTHORIZED",
      label: item.label,
      kind: item.kind,
      importProvider: item.importProvider ?? null,
      lastMessage: connectMsg,
      authorizedAt: new Date(),
      revokedAt: null,
      userId: session.user.id,
    },
  });

  await prisma.alert.create({
    data: {
      familyId: family.id,
      userId: session.user.id,
      type: "CUSTOM",
      title: `Ligação ativada: ${item.label}`,
      message: "Podes desligar esta ligação a qualquer momento em Ligações da Nina.",
      level: "success",
    },
  });

  revalidateAll();
  return { ok: true as const, connection: row, message: connectMsg };
}

export async function pauseConnection(providerKey: string) {
  const { family } = await requireFamilyContext();
  await prisma.ninaConnection.updateMany({
    where: { familyId: family.id, providerKey },
    data: { status: "PAUSED", lastMessage: "Ligação em pausa — sem importações." },
  });
  revalidateAll();
  return { ok: true as const };
}

export async function revokeConnection(providerKey: string) {
  const { family, session } = await requireFamilyContext();
  await prisma.ninaConnection.updateMany({
    where: { familyId: family.id, providerKey },
    data: {
      status: "PAUSED",
      revokedAt: new Date(),
      autoImport: false,
      lastMessage: "Acesso removido. A Nina já não usa este serviço.",
    },
  });
  // Remover registo para voltar ao estado “disponível”
  await prisma.ninaConnection.deleteMany({
    where: { familyId: family.id, providerKey },
  });
  await prisma.alert.create({
    data: {
      familyId: family.id,
      userId: session.user.id,
      type: "CUSTOM",
      title: "Ligação removida",
      message: `Removeste “${catalogByKey(providerKey)?.label ?? providerKey}”. Tudo continua a funcionar por voz.`,
      level: "info",
    },
  });
  revalidateAll();
  return { ok: true as const };
}

export async function setConnectionAutoImport(providerKey: string, autoImport: boolean) {
  const { family } = await requireFamilyContext();
  await prisma.ninaConnection.updateMany({
    where: { familyId: family.id, providerKey, status: "AUTHORIZED" },
    data: { autoImport },
  });
  revalidateAll();
  return { ok: true as const };
}

export async function setAutomationLevel(level: AutomationLevel) {
  const { session } = await requireFamilyContext();
  if (!AUTOMATION_LEVELS.some((l) => l.id === level)) {
    return { ok: false as const, error: "Nível inválido." };
  }
  await prisma.user.update({
    where: { id: session.user.id },
    data: { automationLevel: level },
  });
  revalidateAll();
  return { ok: true as const, level };
}

async function draftsForConnection(providerKey: string, importProvider: ImportProvider | null) {
  const item = catalogByKey(providerKey);
  if (item?.kind === "EMAIL" || providerKey === "gmail" || providerKey === "outlook") {
    return extractInvoicesFromAuthorizedEmail(providerKey);
  }
  if (!importProvider) return [] as ImportedExpenseDraft[];
  const adapter = getImportAdapter(importProvider);
  if (adapter?.fetchRecent) return adapter.fetchRecent();
  if (adapter?.connect) await adapter.connect();
  return [] as ImportedExpenseDraft[];
}

/** Sincroniza uma ligação autorizada: importa e classifica automaticamente. */
export async function syncConnection(providerKey: string) {
  const { session, family, membership } = await requireFamilyContext();
  const connection = await prisma.ninaConnection.findUnique({
    where: { familyId_providerKey: { familyId: family.id, providerKey } },
  });
  if (!connection || connection.status !== "AUTHORIZED") {
    return { ok: false as const, error: "Esta ligação não está ativa." };
  }
  if (catalogByKey(providerKey)?.comingSoon && !connection.importProvider && catalogByKey(providerKey)?.kind !== "EMAIL") {
    await prisma.ninaConnection.update({
      where: { id: connection.id },
      data: {
        lastSyncAt: new Date(),
        lastMessage: "Módulo preparado. A sincronização real chega em breve.",
      },
    });
    revalidateAll();
    return { ok: true as const, imported: 0, message: "Arquitetura pronta — ainda sem dados reais." };
  }

  const drafts = await draftsForConnection(providerKey, connection.importProvider);
  const provider: ImportProvider = connection.importProvider ?? "EMAIL";

  const job = await prisma.importJob.create({
    data: {
      familyId: family.id,
      provider,
      status: drafts.length ? "PROCESSING" : "PENDING",
      sourceLabel: `Ligação · ${connection.label}`,
      parsedJson: JSON.stringify(drafts),
    },
  });

  const space = await getNinaSpace();
  const scope = space === "family" ? ("FAMILY" as const) : ("PERSONAL" as const);
  const categories = await prisma.category.findMany({ where: { familyId: family.id } });
  const bySlug = Object.fromEntries(categories.map((c) => [c.slug, c]));
  const fallback = categories.find((c) => c.slug === "outros") ?? categories[0];

  let imported = 0;
  for (const d of drafts) {
    const cat = (d.categorySlug && bySlug[d.categorySlug]) || fallback;
    if (!cat) continue;
    await prisma.expense.create({
      data: {
        familyId: family.id,
        memberId: membership.id,
        createdById: session.user.id,
        categoryId: cat.id,
        scope,
        amountCents: d.amountCents,
        date: new Date(d.date),
        description: d.description,
        storeName: d.storeName,
        paymentMethod: (d.paymentMethod as PaymentMethod) || "OTHER",
        notes: d.notes ?? `Importado automaticamente · ${connection.label}`,
        importJobId: job.id,
      },
    });
    imported += 1;
  }

  await prisma.importJob.update({
    where: { id: job.id },
    data: { status: imported ? "IMPORTED" : "PENDING" },
  });

  await prisma.ninaConnection.update({
    where: { id: connection.id },
    data: {
      lastSyncAt: new Date(),
      lastMessage: imported
        ? `Importados ${imported} movimentos automaticamente.`
        : "Sem novos movimentos. A Nina continua à escuta.",
    },
  });

  revalidateAll();
  return {
    ok: true as const,
    imported,
    jobId: job.id,
    message: imported
      ? `A Nina importou e classificou ${imported} movimentos de ${connection.label}.`
      : "Nada novo por agora.",
  };
}

/** Sincroniza todas as ligações ativas com auto-import. */
export async function syncAllAuthorizedConnections() {
  const { family } = await requireFamilyContext();
  const list = await prisma.ninaConnection.findMany({
    where: { familyId: family.id, status: "AUTHORIZED", autoImport: true },
  });
  let total = 0;
  for (const c of list) {
    const res = await syncConnection(c.providerKey);
    if (res.ok) total += res.imported;
  }
  return { ok: true as const, imported: total, count: list.length };
}
