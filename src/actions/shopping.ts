"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireFamilyContext } from "@/lib/session";

function revalidateAll() {
  revalidatePath("/", "layout");
}

export async function addShoppingItem(formData: FormData) {
  const { session, family } = await requireFamilyContext();
  const name = String(formData.get("name") || "").trim();
  const quantity = String(formData.get("quantity") || "1").trim() || "1";
  const categorySlug = String(formData.get("categorySlug") || "").trim() || null;
  if (!name) return { ok: false as const, error: "Indica o artigo." };

  const count = await prisma.shoppingListItem.count({ where: { familyId: family.id } });
  await prisma.shoppingListItem.create({
    data: {
      familyId: family.id,
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

export async function clearCheckedShoppingItems() {
  const { family } = await requireFamilyContext();
  await prisma.shoppingListItem.deleteMany({
    where: { familyId: family.id, isChecked: true },
  });
  revalidateAll();
  return { ok: true as const };
}
