import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { getLocale } from "next-intl/server";
import { AppShell } from "@/components/layout/AppShell";
import { PageGreeting } from "@/components/ui/PageGreeting";
import { EmptyState } from "@/components/ui/EmptyState";
import { ExtraMinutesShop } from "@/components/payments/ExtraMinutesShop";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/db";
import { formatMinutes } from "@/lib/utils";

export default async function MinutosPage() {
  const session = await requireRole(["CUSTOMER"]);
  const locale = await getLocale();

  const [packages, ledger] = await Promise.all([
    prisma.extraMinutePackage.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.minuteTransaction.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);

  return (
    <AppShell userName={session.user.name} showCustomerNav activePath="/minutos" locale={locale}>
      <PageGreeting
        hello="Minutos adicionais"
        sub="Compre pacotes extra quando precisar de mais tempo de condução."
      />

      <ExtraMinutesShop packages={packages} />

      <h2 className="font-display" style={{ fontSize: "1.35rem", marginTop: "2rem" }}>
        Histórico de minutos
      </h2>
      <div className="list-stack" style={{ marginTop: "0.75rem" }}>
        {ledger.map((tx) => (
          <div key={tx.id} className="list-item" style={{ cursor: "default" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <strong>
                {tx.minutes > 0 ? "+" : ""}
                {formatMinutes(tx.minutes)}
              </strong>
              <span className="muted">{format(tx.createdAt, "d MMM yyyy HH:mm", { locale: pt })}</span>
            </div>
            <span className="muted">{tx.reason}</span>
            <span className="muted" style={{ display: "block", fontSize: "0.84rem" }}>
              Saldo após: {formatMinutes(tx.balanceAfter)}
            </span>
          </div>
        ))}
        {ledger.length === 0 && (
          <EmptyState title="Sem movimentos" body="As transações de minutos aparecem aqui." />
        )}
      </div>
    </AppShell>
  );
}
