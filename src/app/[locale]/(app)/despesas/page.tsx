import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getActiveFamilyForUser } from "@/lib/session";
import { getExpensesFiltered } from "@/lib/queries";
import { prisma } from "@/lib/db";
import { formatEUR } from "@/lib/money";
import { Panel } from "@/components/ui/FinanceUI";
import { PAYMENT_METHOD_LABELS } from "@/domain/categories";

export default async function DespesasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/pt/login");
  const membership = await getActiveFamilyForUser(session.user.id);
  if (!membership) redirect("/pt/registo");

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
  });
  const categories = await prisma.category.findMany({
    where: { familyId: membership.familyId, kind: "EXPENSE" },
    orderBy: { name: "asc" },
  });
  const accounts = await prisma.financeAccount.findMany({
    where: { familyId: membership.familyId },
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <h1 className="page-title">Despesas</h1>
          <p className="page-sub">Filtre por data, categoria, loja, valor, conta ou método.</p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Link href="/pt/ocr" className="btn btn-ghost">OCR fatura</Link>
          <Link href="/pt/despesas/nova" className="btn btn-primary">+ Nova despesa</Link>
        </div>
      </div>

      <form className="filters">
        <input name="q" placeholder="Pesquisar…" defaultValue={sp.q} />
        <input name="store" placeholder="Loja" defaultValue={sp.store} />
        <select name="categoryId" defaultValue={sp.categoryId ?? ""}>
          <option value="">Categoria</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select name="accountId" defaultValue={sp.accountId ?? ""}>
          <option value="">Conta</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
        <select name="paymentMethod" defaultValue={sp.paymentMethod ?? ""}>
          <option value="">Método</option>
          {Object.entries(PAYMENT_METHOD_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <input name="from" type="date" defaultValue={sp.from} />
        <input name="to" type="date" defaultValue={sp.to} />
        <input name="min" type="number" step="0.01" placeholder="Mín €" defaultValue={sp.min} />
        <input name="max" type="number" step="0.01" placeholder="Máx €" defaultValue={sp.max} />
        <button className="btn btn-primary btn-sm" type="submit">Filtrar</button>
      </form>

      <Panel title={`${expenses.length} resultados`}>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Descrição</th>
                <th>Categoria</th>
                <th>Loja</th>
                <th>Método</th>
                <th>Valor</th>
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
                  <td>{PAYMENT_METHOD_LABELS[e.paymentMethod]}</td>
                  <td className="amount-expense">−{formatEUR(e.amountCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
