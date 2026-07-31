import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { getLocale } from "next-intl/server";
import { AppShell } from "@/components/layout/AppShell";
import { PageGreeting } from "@/components/ui/PageGreeting";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/db";
import { formatEuros } from "@/lib/utils";
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
} from "@/config/constants";

export default async function FaturasPage() {
  const session = await requireRole(["CUSTOMER"]);
  const locale = await getLocale();

  const payments = await prisma.payment.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { subscription: { include: { plan: true } } },
  });

  return (
    <AppShell userName={session.user.name} showCustomerNav activePath="/perfil" locale={locale}>
      <PageGreeting hello="Faturas e pagamentos" sub="Histórico completo de cobranças e recibos." />

      <div className="list-stack">
        {payments.map((p) => (
          <div key={p.id} className="list-item panel" style={{ cursor: "default" }}>
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
              <div>
                <strong>{formatEuros(p.amountCents)}</strong>
                <div className="muted" style={{ marginTop: "0.2rem" }}>
                  {format(p.createdAt, "d MMMM yyyy", { locale: pt })} · {PAYMENT_METHOD_LABELS[p.method]}
                </div>
              </div>
              <span className={`badge ${p.status === "PAID" ? "badge-success" : "badge-warn"}`}>
                {PAYMENT_STATUS_LABELS[p.status]}
              </span>
            </div>
            {p.subscription?.plan && (
              <p className="muted" style={{ margin: "0.5rem 0 0", fontSize: "0.9rem" }}>
                {p.subscription.plan.namePt}
                {p.extraMinutes ? ` · +${p.extraMinutes} min` : ""}
              </p>
            )}
            {p.mbEntity && p.mbReference && (
              <p className="muted" style={{ marginTop: "0.35rem", fontSize: "0.86rem" }}>
                Multibanco: Ent. {p.mbEntity} · Ref. {p.mbReference}
              </p>
            )}
            {p.invoiceUrl && (
              <a href={p.invoiceUrl} className="btn btn-ghost btn-sm" style={{ marginTop: "0.5rem" }} target="_blank" rel="noopener noreferrer">
                Ver fatura
              </a>
            )}
          </div>
        ))}
        {payments.length === 0 && (
          <EmptyState title="Sem pagamentos" body="Quando contratar um plano ou comprar minutos, aparece aqui." />
        )}
      </div>
    </AppShell>
  );
}
