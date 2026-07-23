import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getActiveFamilyForUser } from "@/lib/session";
import { getNinaSpace } from "@/actions/household";
import { prisma } from "@/lib/db";
import { formatEUR, currentYearMonth, monthBounds } from "@/lib/money";
import { incomeScopeWhere, spaceLabel } from "@/lib/scope";
import { Panel } from "@/components/ui/FinanceUI";

export default async function EntradasPage() {
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
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <h1 className="page-title">Entradas · {spaceLabel(space)}</h1>
          <p className="page-sub">
            Total do mês: <span className="text-income">{formatEUR(total)}</span>
          </p>
        </div>
        <Link href="/pt/receitas/nova" className="btn btn-success">
          + Nova entrada
        </Link>
      </div>
      <Panel title="Movimentos">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Descrição</th>
                <th>Categoria</th>
                <th>Membro</th>
                <th>Valor</th>
              </tr>
            </thead>
            <tbody>
              {incomes.map((i) => (
                <tr key={i.id}>
                  <td>{i.date.toLocaleDateString("pt-PT")}</td>
                  <td>{i.description}</td>
                  <td>{i.category.name}</td>
                  <td>{i.member?.displayName ?? "—"}</td>
                  <td className="amount-income">+{formatEUR(i.amountCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
