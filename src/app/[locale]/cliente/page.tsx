import { getLocale } from "next-intl/server";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Link, redirect } from "@/i18n/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { PageGreeting } from "@/components/ui/PageGreeting";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getActiveSubscription } from "@/lib/minutes/ledger";
import {
  availableMinutes,
  formatEuros,
  formatMinutes,
  usagePercent,
  whatsappLink,
} from "@/lib/utils";
import { BRAND } from "@/config/brand";
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  SUBSCRIPTION_STATUS_LABELS,
  TRIP_STATUS_LABELS,
} from "@/config/constants";

export default async function ClienteDashboardPage() {
  const session = await requireRole(["CUSTOMER"]);
  const locale = await getLocale();

  const customer = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    include: { customerProfile: true },
  });

  if (!customer.customerProfile?.profileComplete) {
    redirect({ href: "/perfil", locale });
  }

  const subscription = await getActiveSubscription(customer.id);
  const [upcomingTrips, pastTrips, recentPayments] = await Promise.all([
    prisma.trip.findMany({
      where: {
        customerId: customer.id,
        status: { notIn: ["COMPLETED", "CANCELLED", "NO_SHOW"] },
      },
      orderBy: { scheduledAt: "asc" },
      take: 5,
    }),
    prisma.trip.findMany({
      where: {
        customerId: customer.id,
        status: { in: ["COMPLETED", "CANCELLED", "NO_SHOW"] },
      },
      orderBy: { scheduledAt: "desc" },
      take: 8,
    }),
    prisma.payment.findMany({
      where: { userId: customer.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const avail = subscription ? availableMinutes(subscription) : 0;
  const usage = subscription ? usagePercent(subscription) : 0;
  const lastPaid = recentPayments.find((p) => p.status === "PAID");

  return (
    <AppShell userName={customer.name} showCustomerNav activePath="/cliente" locale={locale}>
      <PageGreeting
        hello={`Olá, ${customer.name.split(" ")[0]}.`}
        sub="O seu painel FC Private Driver — plano, minutos e viagens num só lugar."
      />

      {!customer.emailVerified && (
        <div className="alert-banner alert-banner-warn">
          Confirme o seu e-mail para poder marcar viagens e contratar planos. Verifique a sua caixa de entrada.
        </div>
      )}

      {subscription ? (
        <div className="panel panel-lift" style={{ marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
            <div>
              <div className="label-sm">Plano ativo</div>
              <strong style={{ fontSize: "1.25rem" }}>{subscription.plan.namePt}</strong>
              <div className="muted" style={{ marginTop: "0.25rem" }}>
                {SUBSCRIPTION_STATUS_LABELS[subscription.status]}
                {subscription.nextRenewalAt &&
                  ` · Renovação ${format(subscription.nextRenewalAt, "d MMM yyyy", { locale: pt })}`}
              </div>
            </div>
            <div className="cta-row">
              <Link href="/planos" className="btn btn-secondary btn-sm">
                Renovar / alterar plano
              </Link>
            </div>
          </div>

          <div className="stat-grid">
            <div className="stat-card">
              <div className="label-sm">Incluídos</div>
              <strong>{formatMinutes(subscription.minutesIncluded)}</strong>
            </div>
            <div className="stat-card">
              <div className="label-sm">Utilizados</div>
              <strong>{formatMinutes(subscription.minutesUsed)}</strong>
            </div>
            <div className="stat-card">
              <div className="label-sm">Reservados</div>
              <strong>{formatMinutes(subscription.minutesReserved)}</strong>
            </div>
            <div className="stat-card">
              <div className="label-sm">Disponíveis</div>
              <strong style={{ color: "var(--petrol)" }}>{formatMinutes(avail)}</strong>
            </div>
          </div>
          <div className="label-sm">Utilização {usage}%</div>
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: `${usage}%` }} />
          </div>
        </div>
      ) : (
        <div className="alert-banner alert-banner-info">
          Ainda não tem um plano ativo.{" "}
          <Link href="/planos" style={{ textDecoration: "underline" }}>
            Escolher plano
          </Link>
        </div>
      )}

      <div className="cta-row" style={{ marginBottom: "1.5rem" }}>
        <Link href="/cliente/viagem/nova" className="btn btn-primary">
          Marcar viagem
        </Link>
        <a
          href={whatsappLink(BRAND.phoneE164, "Olá, preciso de falar com o meu motorista FC Private Driver.")}
          className="btn btn-secondary"
          target="_blank"
          rel="noopener noreferrer"
        >
          Contactar motorista
        </a>
        <Link href="/faturas" className="btn btn-ghost">
          Ver faturas
        </Link>
      </div>

      <div className="grid-2">
        <div>
          <h2 className="font-display" style={{ fontSize: "1.35rem" }}>
            Próximas viagens
          </h2>
          <div className="list-stack" style={{ marginTop: "0.75rem" }}>
            {upcomingTrips.map((trip) => (
              <Link key={trip.id} href={`/cliente/viagens/${trip.id}`} className="list-item">
                <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
                  <strong>
                    {trip.pickupAddress.split(",")[0]} → {trip.dropoffAddress.split(",")[0]}
                  </strong>
                  <span className="badge">{TRIP_STATUS_LABELS[trip.status]}</span>
                </div>
                <span className="muted">
                  {format(trip.scheduledAt, "EEEE, d MMM · HH:mm", { locale: pt })}
                </span>
              </Link>
            ))}
            {upcomingTrips.length === 0 && (
              <EmptyState title="Sem viagens agendadas" body="Marque a sua próxima viagem com o botão acima." />
            )}
          </div>
        </div>

        <div>
          <h2 className="font-display" style={{ fontSize: "1.35rem" }}>
            Histórico
          </h2>
          <div className="list-stack" style={{ marginTop: "0.75rem" }}>
            {pastTrips.map((trip) => (
              <Link key={trip.id} href={`/cliente/viagens/${trip.id}`} className="list-item">
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <strong>
                    {trip.pickupAddress.split(",")[0]} → {trip.dropoffAddress.split(",")[0]}
                  </strong>
                  <span className="badge badge-neutral">{TRIP_STATUS_LABELS[trip.status]}</span>
                </div>
                <span className="muted">
                  {format(trip.scheduledAt, "d MMM yyyy", { locale: pt })}
                  {trip.chargedMinutes ? ` · ${formatMinutes(trip.chargedMinutes)}` : ""}
                </span>
              </Link>
            ))}
            {pastTrips.length === 0 && (
              <EmptyState title="Ainda sem histórico" body="As viagens concluídas aparecem aqui." />
            )}
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: "1.75rem" }}>
        <h2 className="font-display" style={{ fontSize: "1.2rem", marginBottom: "0.75rem" }}>
          Pagamentos
        </h2>
        {lastPaid && (
          <p className="muted" style={{ marginBottom: "0.75rem" }}>
            Método recente: {PAYMENT_METHOD_LABELS[lastPaid.method]}
          </p>
        )}
        <div className="list-stack">
          {recentPayments.map((p) => (
            <div key={p.id} className="list-item" style={{ cursor: "default" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <strong>{formatEuros(p.amountCents)}</strong>
                <span className={`badge ${p.status === "PAID" ? "badge-success" : "badge-warn"}`}>
                  {PAYMENT_STATUS_LABELS[p.status]}
                </span>
              </div>
              <span className="muted">
                {format(p.createdAt, "d MMM yyyy", { locale: pt })} · {PAYMENT_METHOD_LABELS[p.method]}
              </span>
            </div>
          ))}
          {recentPayments.length === 0 && <p className="muted">Sem pagamentos registados.</p>}
        </div>
      </div>
    </AppShell>
  );
}
