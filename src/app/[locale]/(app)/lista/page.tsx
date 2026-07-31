import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getActiveFamilyForUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { EmptyState, Panel } from "@/components/ui/FinanceUI";
import { ShoppingListClient } from "@/components/nina/ShoppingListClient";

export default async function ListaPage({
  searchParams,
}: {
  searchParams?: Promise<{ list?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/pt/login");
  const membership = await getActiveFamilyForUser(session.user.id);
  if (!membership) redirect("/pt/registo");

  let lists = await prisma.shoppingList.findMany({
    where: { familyId: membership.familyId },
    include: {
      items: {
        orderBy: [{ isChecked: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
      },
    },
    orderBy: { createdAt: "asc" },
  });

  if (lists.length === 0) {
    const created = await prisma.shoppingList.create({
      data: {
        familyId: membership.familyId,
        createdById: session.user.id,
        name: "Lista de compras",
        isShared: true,
      },
      include: { items: true },
    });
    lists = [created];
  }

  const sp = (await searchParams) || {};
  const activeListId =
    lists.find((l) => l.id === sp.list)?.id || lists[0]?.id || "";

  const openCount =
    lists.find((l) => l.id === activeListId)?.items.filter((i) => !i.isChecked).length ?? 0;

  return (
    <div className="page-stack">
      <h1 className="page-title">Lista de compras</h1>
      <p className="page-sub">
        Diz ou escreve o produto — a Nina pesquisa no Continente e no Pingo Doce, mostra preços
        quando disponíveis e, com «Vou às compras», compara o total entre lojas.
      </p>
      <Panel title={`${openCount} por comprar`}>
        {lists.length === 0 ? (
          <EmptyState title="Sem listas" body="Cria a primeira lista para começar." />
        ) : (
          <ShoppingListClient
            lists={lists.map((l) => ({
              id: l.id,
              name: l.name,
              isShared: l.isShared,
              items: l.items.map((i) => ({
                id: i.id,
                name: i.name,
                quantity: i.quantity,
                categorySlug: i.categorySlug,
                isChecked: i.isChecked,
                brand: i.brand,
                weight: i.weight,
                priceCents: i.priceCents,
                imageUrl: i.imageUrl,
                storeName: i.storeName,
                productUrl: i.productUrl,
              })),
            }))}
            activeListId={activeListId}
          />
        )}
      </Panel>
    </div>
  );
}
