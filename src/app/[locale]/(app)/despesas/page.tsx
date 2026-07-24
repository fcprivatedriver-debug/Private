import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getActiveFamilyForUser } from "@/lib/session";
import { getExpensesFiltered } from "@/lib/queries";
import { getNinaSpace } from "@/actions/household";
import { prisma } from "@/lib/db";
import { formatEUR } from "@/lib/money";
import { spaceLabel } from "@/lib/scope";
import { EmptyState, Panel } from "@/components/ui/FinanceUI";
import { TransactionActions } from "@/components/finance/TransactionActions";

export default async function GastosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/pt/login");
  const membership = await getActiveFamilyForUser(session.user.id);
  if (!membership) redirect("/pt/registo");

  const space = await getNinaSpace();
  const sp = await searchParams;
  const expenses = await getExpensesFiltered(membership.familyId, {
    q: sp.q,
    categoryId: sp.categoryId,
    store: sp.store,
    accountId: sp.accountId,
    paymentMethod: sp.paymentMethod,
    min: sp.min ? Number(sp.min) : undefined,
    max: sp.max ? Number(sp.max) : undefined,
    from: sp.from,
    to: sp.to,
    space,
    memberId: membership.id,
  });
  const categories = await prisma.category.findMany({
    where: { familyId: membership.familyId, kind: "EXPENSE" },
    orderBy: { name: "asc" },
  });
  const accounts = await prisma.financeAccount.findMany({
    where: { familyId: membership.familyId },
  });

  return (
    <div className="page-stack">
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Despesas · {spaceLabel(space)}</h1>
          <p className="page-sub">
            Começa vazia. Adiciona por voz, fotografia ou manualmente — e edita quando quiseres.
          </p>
        </div>
        <div className="btn-row">
          <Link href="/pt/captura" className="btn btn-ghost">
            Captura
          </Link>
          <Link href="/pt/despesas/nova" className="btn btn-primary">
            + Adicionar despesa
          </Link>
        </div>
      </div>

      {expenses.length > 0 || sp.q || sp.categoryId ? (
        <form className="filters">
          <input name="q" placeholder="Pesquisar…" defaultValue={sp.q} />
          <input name="store" placeholder="Loja" defaultValue={sp.store} />
          <select name="categoryId" defaultValue={sp.categoryId ?? ""}>
            <option value="">Categoria</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select name="accountId" defaultValue={sp.accountId ?? ""}>
            <option value="">Conta</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <button className="btn btn-primary btn-sm" type="submit">
            Filtrar
          </button>
        </form>
      ) : null}

      <Panel title={expenses.length ? `${expenses.length} resultados` : "Despesas"}>
        {expenses.length === 0 ? (
          <EmptyState
            title="Ainda sem despesas"
            body="Quando gastares, diz à Nina, fotografa o talão ou regista aqui. Nada é criado automaticamente."
          />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Descrição</th>
                  <th>Categoria</th>
                  <th>Loja</th>
                  <th>Valor</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.id}>
                    <td>
                      {e.date.toLocaleDateString("pt-PT")}
                      {e.time ? ` ${e.time}` : ""}
                    </td>
                    <td>{e.description}</td>
                    <td>{e.category.name}</td>
                    <td>{e.storeName ?? "—"}</td>
                    <td className="amount-expense">−{formatEUR(e.amountCents)}</td>
                    <td>
                      <TransactionActions id={e.id} kind="expense" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
