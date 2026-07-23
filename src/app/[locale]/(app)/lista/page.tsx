import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getActiveFamilyForUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { Panel } from "@/components/ui/FinanceUI";
import { ShoppingListClient } from "@/components/nina/ShoppingListClient";

export default async function ListaPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/pt/login");
  const membership = await getActiveFamilyForUser(session.user.id);
  if (!membership) redirect("/pt/registo");

  const items = await prisma.shoppingListItem.findMany({
    where: { familyId: membership.familyId },
    orderBy: [{ isChecked: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return (
    <div>
      <h1 className="page-title">Lista de compras</h1>
      <p className="page-sub">
        Partilhada na Conta Familiar — marca o que já está no carrinho.
      </p>
      <Panel title={`${items.filter((i) => !i.isChecked).length} por comprar`}>
        <ShoppingListClient items={items} />
      </Panel>
    </div>
  );
}
