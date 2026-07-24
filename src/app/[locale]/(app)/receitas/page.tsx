import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getActiveFamilyForUser } from "@/lib/session";
import { getNinaSpace } from "@/actions/household";
import { prisma } from "@/lib/db";
import { formatEUR, currentYearMonth, monthBounds } from "@/lib/money";
import { incomeScopeWhere, spaceLabel } from "@/lib/scope";
import { EmptyState, Panel } from "@/components/ui/FinanceUI";
import { authorLabel } from "@/lib/transaction-audit";

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
    include: {
      category: true,
      member: true,
      account: true,
      createdBy: { select: { name: true } },
    },
    orderBy: { date: "desc" },
  });
  const total = incomes.reduce((s, i) => s + i.amountCents, 0);
  const showAuthor = membership.family.kind !== "INDIVIDUAL";

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
          <div className="tx-list">
            {incomes.map((i) => {
              const who = authorLabel({
                memberDisplayName: i.member?.displayName,
                createdByName: i.createdBy?.name,
              });
              return (
                <Link key={i.id} href={`/pt/receitas/${i.id}`} className="tx-row">
                  <div className="tx-row-main">
                    {showAuthor ? <span className="tx-author">{who}</span> : null}
                    <strong>{i.description}</strong>
                    <span>
                      {i.date.toLocaleDateString("pt-PT")} · {i.category.name}
                      {i.scope === "FAMILY" ? " · Familiar" : " · Pessoal"}
                    </span>
                  </div>
                  <span className="amount-income">+{formatEUR(i.amountCents)}</span>
                </Link>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}
