import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getActiveFamilyForUser } from "@/lib/session";
import { getNinaSpace } from "@/actions/household";
import { prisma } from "@/lib/db";
import { formatEUR, currentYearMonth, monthBounds } from "@/lib/money";
import { expenseScopeWhere, incomeScopeWhere, spaceLabel } from "@/lib/scope";
import { EmptyState, Panel } from "@/components/ui/FinanceUI";

type TxRow = {
  id: string;
  kind: "income" | "expense";
  description: string;
  amountCents: number;
  date: Date;
  categoryName: string;
  scope: "PERSONAL" | "FAMILY";
  href: string;
};

export default async function TransacoesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/pt/login");
  const membership = await getActiveFamilyForUser(session.user.id);
  if (!membership) redirect("/pt/registo");

  const space = await getNinaSpace();
  const { year, month } = currentYearMonth();
  const { start, end } = monthBounds(year, month);

  const [incomes, expenses] = await Promise.all([
    prisma.income.findMany({
      where: {
        familyId: membership.familyId,
        date: { gte: start, lte: end },
        ...incomeScopeWhere(space, membership.id),
      },
      include: { category: true },
      orderBy: { date: "desc" },
    }),
    prisma.expense.findMany({
      where: {
        familyId: membership.familyId,
        date: { gte: start, lte: end },
        ...expenseScopeWhere(space, membership.id),
      },
      include: { category: true },
      orderBy: { date: "desc" },
    }),
  ]);

  const rows: TxRow[] = [
    ...incomes.map((i) => ({
      id: i.id,
      kind: "income" as const,
      description: i.description,
      amountCents: i.amountCents,
      date: i.date,
      categoryName: i.category.name,
      scope: i.scope,
      href: `/pt/receitas/${i.id}`,
    })),
    ...expenses.map((e) => ({
      id: e.id,
      kind: "expense" as const,
      description: e.description,
      amountCents: e.amountCents,
      date: e.date,
      categoryName: e.category.name,
      scope: e.scope,
      href: `/pt/despesas/${e.id}`,
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <div className="page-stack">
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Transações · {spaceLabel(space)}</h1>
          <p className="page-sub">
            Todas as receitas e despesas. Toca num movimento para abrir a ficha — editar ou
            eliminar.
          </p>
        </div>
        <div className="btn-row">
          <Link href="/pt/receitas/nova" className="btn btn-success btn-sm">
            + Receita
          </Link>
          <Link href="/pt/despesas/nova" className="btn btn-primary btn-sm">
            + Despesa
          </Link>
        </div>
      </div>

      <Panel title={rows.length ? `${rows.length} movimentos` : "Movimentos"}>
        {rows.length === 0 ? (
          <EmptyState
            title="Ainda sem transações"
            body="Adiciona uma receita ou despesa. Depois podes tocar nela para editar ou eliminar."
          />
        ) : (
          <div className="tx-list">
            {rows.map((t) => (
              <Link key={`${t.kind}-${t.id}`} href={t.href} className="tx-row">
                <div className="tx-row-main">
                  <span className="tx-kind-label">
                    {t.kind === "income" ? "Receita" : "Despesa"}
                  </span>
                  <strong>{t.description}</strong>
                  <span>
                    {t.date.toLocaleDateString("pt-PT")} · {t.categoryName}
                    {t.scope === "FAMILY" ? " · Familiar" : " · Pessoal"}
                  </span>
                </div>
                <div className="tx-row-side">
                  <span className={t.kind === "income" ? "amount-income" : "amount-expense"}>
                    {t.kind === "income" ? "+" : "−"}
                    {formatEUR(t.amountCents)}
                  </span>
                  <span className="muted small">Abrir →</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
