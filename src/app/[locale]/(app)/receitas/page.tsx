import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getActiveFamilyForUser } from "@/lib/session";
import { getNinaSpace } from "@/actions/household";
import { prisma } from "@/lib/db";
import { formatEUR, currentYearMonth, monthBounds } from "@/lib/money";
import { incomeScopeWhere, spaceLabel } from "@/lib/scope";
import { EmptyState, Panel } from "@/components/ui/FinanceUI";
import { TransactionActions } from "@/components/finance/TransactionActions";

export default async function ReceitasPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/pt/login");
  const membership = await getActiveFamilyForUser(session.user.id);
  if (!membership) redirect("/pt/registo");

  const space = await getNinaSpace();
  const { year, month } = currentYearMonth();
  const { start, end } = monthBounds(year, month);
  const incomes = await prisma.income.findMany({
    where: {
      familyId: membership.familyId,
      date: { gte: start, lte: end },
      ...incomeScopeWhere(space, membership.id),
    },
    include: { category: true, member: true, account: true },
    orderBy: { date: "desc" },
  });
  const total = incomes.reduce((s, i) => s + i.amountCents, 0);

  return (
    <div className="page-stack">
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Receitas · {spaceLabel(space)}</h1>
          <p className="page-sub">
            Total do mês: <span className="text-income">{formatEUR(total)}</span>
          </p>
        </div>
        <Link href="/pt/receitas/nova" className="btn btn-success">
          + Adicionar receita
        </Link>
      </div>

      <Panel title="Movimentos">
        {incomes.length === 0 ? (
          <EmptyState
            title="Ainda sem receitas"
            body="Adiciona o teu salário, um subsídio ou outra entrada. O dashboard atualiza sozinho."
          />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Descrição</th>
                  <th>Tipo</th>
                  <th>Conta</th>
                  <th>Valor</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {incomes.map((i) => (
                  <tr key={i.id}>
                    <td>{i.date.toLocaleDateString("pt-PT")}</td>
                    <td>{i.description}</td>
                    <td>{i.category.name}</td>
                    <td>{i.account?.name ?? "—"}</td>
                    <td className="amount-income">+{formatEUR(i.amountCents)}</td>
                    <td>
                      <TransactionActions id={i.id} kind="income" />
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
