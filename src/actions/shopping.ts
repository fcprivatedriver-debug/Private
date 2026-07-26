"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireFamilyContext } from "@/lib/session";
import {
  categoryKeyFromQuery,
  compareBasket,
  searchProducts,
  type ProductMatch,
} from "@/lib/products";
import { formatEUR } from "@/lib/money";

function revalidateAll() {
  revalidatePath("/", "layout");
}

async function ensureDefaultList(familyId: string, userId?: string) {
  const existing = await prisma.shoppingList.findFirst({
    where: { familyId },
    orderBy: { createdAt: "asc" },
  });
  if (existing) return existing;
  return prisma.shoppingList.create({
    data: {
      familyId,
      createdById: userId,
      name: "Lista de compras",
      isShared: true,
    },
  });
}

async function rememberPreference(
  familyId: string,
  userId: string,
  query: string,
  product: ProductMatch,
) {
  const categoryKey = categoryKeyFromQuery(query);
  await prisma.productPreference.upsert({
    where: {
      familyId_userId_categoryKey: { familyId, userId, categoryKey },
    },
    create: {
      familyId,
      userId,
      categoryKey,
      preferredName: product.name,
      brand: product.brand,
      storeName: product.storeName,
      productUrl: product.productUrl,
      imageUrl: product.imageUrl,
      priceCents: product.priceCents,
      useCount: 1,
      lastUsedAt: new Date(),
    },
    update: {
      preferredName: product.name,
      brand: product.brand,
      storeName: product.storeName,
      productUrl: product.productUrl,
      imageUrl: product.imageUrl,
      priceCents: product.priceCents,
      useCount: { increment: 1 },
      lastUsedAt: new Date(),
    },
  });
}

export async function createShoppingList(formData: FormData) {
  const { session, family } = await requireFamilyContext();
  const name = String(formData.get("name") || "").trim() || "Nova lista";
  const list = await prisma.shoppingList.create({
    data: {
      familyId: family.id,
      createdById: session.user.id,
      name,
      isShared: true,
    },
  });
  revalidateAll();
  return { ok: true as const, listId: list.id };
}

export async function renameShoppingList(formData: FormData) {
  const { family } = await requireFamilyContext();
  const id = String(formData.get("listId") || "");
  const name = String(formData.get("name") || "").trim();
  if (!id || !name) return { ok: false as const, error: "Nome em falta." };
  await prisma.shoppingList.updateMany({
    where: { id, familyId: family.id },
    data: { name },
  });
  revalidateAll();
  return { ok: true as const };
}

export async function deleteShoppingList(listId: string) {
  const { family } = await requireFamilyContext();
  const count = await prisma.shoppingList.count({ where: { familyId: family.id } });
  if (count <= 1) return { ok: false as const, error: "Mantém pelo menos uma lista." };
  await prisma.shoppingList.deleteMany({ where: { id: listId, familyId: family.id } });
  revalidateAll();
  return { ok: true as const };
}

export async function addShoppingItem(formData: FormData) {
  const { session, family } = await requireFamilyContext();
  const name = String(formData.get("name") || "").trim();
  const quantity = String(formData.get("quantity") || "1").trim() || "1";
  const categorySlug = String(formData.get("categorySlug") || "").trim() || null;
  let listId = String(formData.get("listId") || "").trim();
  if (!name) return { ok: false as const, error: "Indica o artigo." };

  if (!listId) {
    const list = await ensureDefaultList(family.id, session.user.id);
    listId = list.id;
  }

  const count = await prisma.shoppingListItem.count({ where: { listId } });
  await prisma.shoppingListItem.create({
    data: {
      familyId: family.id,
      listId,
      createdById: session.user.id,
      name,
      quantity,
      categorySlug,
      sortOrder: count,
    },
  });
  revalidateAll();
  return { ok: true as const };
}

/** Adiciona por voz/texto natural — pesquisa Product Service + preferências. */
export async function addShoppingItemNatural(utterance: string, listId?: string) {
  const { session, family } = await requireFamilyContext();
  const query = utterance.trim();
  if (!query) return { ok: false as const, error: "Diz o que queres adicionar." };

  let activeListId = listId?.trim() || "";
  if (!activeListId) {
    const list = await ensureDefaultList(family.id, session.user.id);
    activeListId = list.id;
  }

  const categoryKey = categoryKeyFromQuery(query);
  const pref = await prisma.productPreference.findUnique({
    where: {
      familyId_userId_categoryKey: {
        familyId: family.id,
        userId: session.user.id,
        categoryKey,
      },
    },
  });

  // «Adiciona manteiga» sem marca → sugere preferência
  const bareCategory = /^(um|uma|dois|duas)?\s*(manteiga|leite|cafe|café|banana|bananas|pao|pão|ovos)\s*$/i.test(
    query.replace(/^(adiciona|mete|poe|põe)\s+/i, "").trim(),
  );

  if (pref && bareCategory) {
    const count = await prisma.shoppingListItem.count({ where: { listId: activeListId } });
    await prisma.shoppingListItem.create({
      data: {
        familyId: family.id,
        listId: activeListId,
        createdById: session.user.id,
        name: pref.preferredName,
        brand: pref.brand,
        quantity: "1",
        priceCents: pref.priceCents,
        imageUrl: pref.imageUrl,
        storeName: pref.storeName,
        productUrl: pref.productUrl,
        categorySlug: categoryKey,
        sortOrder: count,
      },
    });
    await prisma.productPreference.update({
      where: { id: pref.id },
      data: { useCount: { increment: 1 }, lastUsedAt: new Date() },
    });
    revalidateAll();
    return {
      ok: true as const,
      reply: `Perfeito 😊 Como de costume, adicionei ${pref.preferredName}${pref.brand ? ` (${pref.brand})` : ""}.`,
      status: "added" as const,
    };
  }

  const result = await searchProducts(query);

  if (result.status === "none") {
    const count = await prisma.shoppingListItem.count({ where: { listId: activeListId } });
    await prisma.shoppingListItem.create({
      data: {
        familyId: family.id,
        listId: activeListId,
        createdById: session.user.id,
        name: query,
        quantity: "1",
        sortOrder: count,
      },
    });
    revalidateAll();
    return {
      ok: true as const,
      reply: `Já adicionei «${query}» à tua lista. Se quiseres uma marca específica, diz-me.`,
      status: "added_plain" as const,
    };
  }

  if (result.status === "choices") {
    return {
      ok: true as const,
      status: "choices" as const,
      reply: `Encontrei várias opções para «${query}». Qual preferes?`,
      choices: result.products.map((p) => ({
        id: p.id,
        label: `${p.name}${p.priceCents != null ? ` — ${formatEUR(p.priceCents)}` : ""} · ${p.storeName}`,
        product: p,
      })),
    };
  }

  const product = result.product;
  const count = await prisma.shoppingListItem.count({ where: { listId: activeListId } });
  await prisma.shoppingListItem.create({
    data: {
      familyId: family.id,
      listId: activeListId,
      createdById: session.user.id,
      name: product.name,
      brand: product.brand,
      weight: product.weight,
      quantity: "1",
      categorySlug: product.categorySlug,
      priceCents: product.priceCents,
      imageUrl: product.imageUrl,
      storeName: product.storeName,
      productUrl: product.productUrl,
      externalProductId: product.id,
      sortOrder: count,
    },
  });
  await rememberPreference(family.id, session.user.id, query, product);
  revalidateAll();

  const priceBit =
    product.priceCents != null ? ` por ${formatEUR(product.priceCents)}` : "";
  return {
    ok: true as const,
    status: "added" as const,
    reply: `Encontrei ${product.name}${priceBit} no ${product.storeName}. Já adicionei 😊`,
    product,
  };
}

export async function confirmShoppingProductChoice(
  productJson: string,
  listId?: string,
) {
  const { session, family } = await requireFamilyContext();
  let product: ProductMatch;
  try {
    product = JSON.parse(productJson) as ProductMatch;
  } catch {
    return { ok: false as const, error: "Escolha inválida." };
  }

  let activeListId = listId?.trim() || "";
  if (!activeListId) {
    const list = await ensureDefaultList(family.id, session.user.id);
    activeListId = list.id;
  }

  const count = await prisma.shoppingListItem.count({ where: { listId: activeListId } });
  await prisma.shoppingListItem.create({
    data: {
      familyId: family.id,
      listId: activeListId,
      createdById: session.user.id,
      name: product.name,
      brand: product.brand,
      weight: product.weight,
      quantity: "1",
      categorySlug: product.categorySlug,
      priceCents: product.priceCents,
      imageUrl: product.imageUrl,
      storeName: product.storeName,
      productUrl: product.productUrl,
      externalProductId: product.id,
      sortOrder: count,
    },
  });
  await rememberPreference(family.id, session.user.id, product.name, product);
  revalidateAll();
  return {
    ok: true as const,
    reply: `Perfeito 😊 ${product.name} já está na lista.`,
  };
}

export async function compareShoppingTrip() {
  const { session, family } = await requireFamilyContext();
  const list = await ensureDefaultList(family.id, session.user.id);
  const items = await prisma.shoppingListItem.findMany({
    where: { listId: list.id, isChecked: false },
  });

  if (items.length === 0) {
    return {
      ok: true as const,
      reply:
        "A tua lista está vazia por agora. Diz-me o que precisas — por exemplo «Nina, adiciona leite Vigor».",
    };
  }

  const names = items.map((i) => i.name);
  const comparison = await compareBasket(names);
  if (!comparison.best) {
    return {
      ok: true as const,
      reply: "Ainda não consegui comparar preços para estes artigos. Tenta mais tarde.",
    };
  }

  const lines = comparison.quotes
    .filter((q) => q.lines.some((l) => l.found))
    .map((q) => `${q.storeName}: ${formatEUR(q.totalCents)}`)
    .join("\n");

  const savings =
    comparison.savingsCents > 0
      ? `\n\nHoje compensa ires ao ${comparison.best.storeName}. Poupas aproximadamente ${formatEUR(comparison.savingsCents)}.`
      : `\n\nOs totais estão próximos — escolhe o que te for mais conveniente.`;

  return {
    ok: true as const,
    reply: `Olhei para a tua lista (${items.length} artigos):\n${lines}${savings}`,
    comparison,
  };
}

export async function updateShoppingItem(formData: FormData) {
  const { family } = await requireFamilyContext();
  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const quantity = String(formData.get("quantity") || "1").trim() || "1";
  if (!id || !name) return { ok: false as const, error: "Dados inválidos." };
  await prisma.shoppingListItem.updateMany({
    where: { id, familyId: family.id },
    data: { name, quantity },
  });
  revalidateAll();
  return { ok: true as const };
}

export async function toggleShoppingItem(id: string) {
  const { family } = await requireFamilyContext();
  const item = await prisma.shoppingListItem.findFirst({
    where: { id, familyId: family.id },
  });
  if (!item) return { ok: false as const, error: "Item não encontrado." };
  await prisma.shoppingListItem.update({
    where: { id },
    data: { isChecked: !item.isChecked },
  });
  revalidateAll();
  return { ok: true as const };
}

export async function removeShoppingItem(id: string) {
  const { family } = await requireFamilyContext();
  await prisma.shoppingListItem.deleteMany({ where: { id, familyId: family.id } });
  revalidateAll();
  return { ok: true as const };
}

export async function clearCheckedShoppingItems(listId?: string) {
  const { family } = await requireFamilyContext();
  await prisma.shoppingListItem.deleteMany({
    where: {
      familyId: family.id,
      isChecked: true,
      ...(listId ? { listId } : {}),
    },
  });
  revalidateAll();
  return { ok: true as const };
}
