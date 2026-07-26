import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getActiveFamilyForUser } from "@/lib/session";
import { getExpensesFiltered } from "@/lib/queries";
import { prisma } from "@/lib/db";
import { formatEUR } from "@/lib/money";
import { Panel } from "@/components/ui/FinanceUI";

export default async function PesquisaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/pt/login");
  const membership = await getActiveFamilyForUser(session.user.id);
  if (!membership) redirect("/pt/registo");

  const { q } = await searchParams;
  const expenses = q
    ? await getExpensesFiltered(membership.familyId, { q })
    : [];
  const incomes = q
    ? await prisma.income.findMany({
        where: {
          familyId: membership.familyId,
          OR: [
            { description: { contains: q, mode: "insensitive" } },
            { notes: { contains: q, mode: "insensitive" } },
            { category: { name: { contains: q, mode: "insensitive" } } },
          ],
        },
        include: { category: true },
        take: 50,
      })
    : [];

  return (
    <div>
      <h1 className="page-title">Pesquisa inteligente</h1>
      <p className="page-sub">Categoria, loja, produto, data, valor ou método de pagamento.</p>
      <form className="filters" style={{ gridTemplateColumns: "1fr auto" }}>
        <input
          name="q"
          placeholder="Ex: Continente, combustível, Netflix, 45,50…"
          defaultValue={q}
          autoFocus
        />
        <button className="btn btn-primary" type="submit">Pesquisar</button>
      </form>

      {!q ? (
        <Panel title="Sugestões">
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {["Continente", "Galp", "Netflix", "supermercado", "MB_WAY"].map((s) => (
              <Link key={s} href={`/pt/pesquisa?q=${encodeURIComponent(s)}`} className="btn btn-ghost btn-sm">
                {s}
              </Link>
            ))}
          </div>
        </Panel>
      ) : (
        <div className="stack-lg">
          <Panel title={`Despesas (${expenses.length})`}>
            <div className="list-rows">
              {expenses.map((e) => (
                <div key={e.id} className="list-row">
                  <div className="list-row-main">
                    <strong>{e.description}</strong>
                    <span>
                      {e.category.name}
                      {e.storeName ? ` · ${e.storeName}` : ""} · {e.date.toLocaleDateString("pt-PT")}
                    </span>
                  </div>
                  <span className="amount-expense">−{formatEUR(e.amountCents)}</span>
                </div>
              ))}
              {expenses.length === 0 ? <p className="muted">Sem resultados.</p> : null}
            </div>
          </Panel>
          <Panel title={`Receitas (${incomes.length})`}>
            <div className="list-rows">
              {incomes.map((i) => (
                <div key={i.id} className="list-row">
                  <div className="list-row-main">
                    <strong>{i.description}</strong>
                    <span>{i.category.name} · {i.date.toLocaleDateString("pt-PT")}</span>
                  </div>
                  <span className="amount-income">+{formatEUR(i.amountCents)}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}
