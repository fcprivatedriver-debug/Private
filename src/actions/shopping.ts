"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireFamilyContext } from "@/lib/session";

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
