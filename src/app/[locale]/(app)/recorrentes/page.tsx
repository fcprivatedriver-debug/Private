import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getActiveFamilyForUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { formatEUR } from "@/lib/money";
import { Panel } from "@/components/ui/FinanceUI";
import { RecurringForm } from "@/components/finance/Forms";
import { PAYMENT_METHOD_LABELS } from "@/domain/categories";

export default async function RecorrentesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/pt/login");
  const membership = await getActiveFamilyForUser(session.user.id);
  if (!membership) redirect("/pt/registo");

  const [items, categories, accounts] = await Promise.all([
    prisma.recurringPayment.findMany({
      where: { familyId: membership.familyId },
      include: { category: true, account: true },
      orderBy: { nextDueDate: "asc" },
    }),
    prisma.category.findMany({ where: { familyId: membership.familyId } }),
    prisma.financeAccount.findMany({ where: { familyId: membership.familyId } }),
  ]);

  return (
    <div>
      <h1 className="page-title">Pagamentos recorrentes</h1>
      <p className="page-sub">Renda, água, luz, gás, internet, Netflix, Spotify, seguros, ginásio…</p>
      <div className="two-col">
        <Panel title="Agendados">
          <div className="list-rows">
            {items.map((r) => (
              <div key={r.id} className="list-row">
                <div className="list-row-main">
                  <strong>{r.name}</strong>
                  <span>
                    {r.category.name} · {r.frequency} ·{" "}
                    {r.nextDueDate.toLocaleDateString("pt-PT")} ·{" "}
                    {PAYMENT_METHOD_LABELS[r.paymentMethod]}
                    {!r.isActive ? " · pausado" : ""}
                  </span>
                </div>
                <span className="amount-expense">{formatEUR(r.amountCents)}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Novo recorrente">
          <RecurringForm categories={categories} accounts={accounts} />
        </Panel>
      </div>
    </div>
  );
}
