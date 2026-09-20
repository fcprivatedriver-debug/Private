/**
 * Garante categorias de despesa alinhadas com DEFAULT_EXPENSE_CATEGORIES.
 * - Renomeia "Luz" → "Eletricidade" (slug luz preservado)
 * - Cria "Eletricidade/Gás" se faltar
 * Sem migration: só upserts por família.
 */
import { prisma } from "@/lib/db";
import { DEFAULT_EXPENSE_CATEGORIES } from "@/domain/categories";

export async function ensureExpenseCategories(familyId: string): Promise<void> {
  const existing = await prisma.category.findMany({
    where: { familyId, kind: "EXPENSE" },
    select: { id: true, slug: true, name: true, sortOrder: true },
  });
  const bySlug = new Map(existing.map((c) => [c.slug, c]));

  for (let i = 0; i < DEFAULT_EXPENSE_CATEGORIES.length; i++) {
    const preset = DEFAULT_EXPENSE_CATEGORIES[i];
    const row = bySlug.get(preset.slug);
    if (!row) {
      await prisma.category.create({
        data: {
          familyId,
          name: preset.name,
          slug: preset.slug,
          icon: preset.icon,
          color: preset.color,
          kind: "EXPENSE",
          isSystem: true,
          sortOrder: i,
        },
      });
      continue;
    }
    // Corrigir label Luz → Eletricidade e sortOrder desactualizado
    if (row.name !== preset.name || row.sortOrder !== i) {
      await prisma.category.update({
        where: { id: row.id },
        data: { name: preset.name, sortOrder: i },
      });
    }
  }

  // Renomear legado "Luz" se ainda existir com outro slug
  await prisma.category.updateMany({
    where: { familyId, kind: "EXPENSE", name: "Luz", slug: "luz" },
    data: { name: "Eletricidade" },
  });
}

/** Lista categorias de despesa na ordem correcta (sortOrder, depois nome). */
export async function listExpenseCategories(familyId: string) {
  await ensureExpenseCategories(familyId);
  return prisma.category.findMany({
    where: { familyId, kind: "EXPENSE" },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}
