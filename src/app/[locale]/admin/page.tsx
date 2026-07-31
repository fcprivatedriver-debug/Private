import { Link } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { AppShell } from "@/components/layout/AppShell";
import { PageGreeting, SummaryStrip } from "@/components/ui/PageGreeting";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/db";

export default async function AdminPage() {
  await requireRole(["ADMIN"]);
  const locale = await getLocale();

  const [
    customers,
    drivers,
    activeSubs,
    pendingTrips,
    pendingPayments,
    tripsToday,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.driverProfile.count({ where: { active: true } }),
    prisma.subscription.count({ where: { status: "ACTIVE" } }),
    prisma.trip.count({ where: { status: "AWAITING_CONFIRMATION" } }),
    prisma.payment.count({ where: { status: "PENDING" } }),
    prisma.trip.count({
      where: {
        scheduledAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lt: new Date(new Date().setHours(23, 59, 59, 999)),
        },
      },
    }),
  ]);

  const links = [
    { href: "/admin/clientes", label: "Clientes", desc: "Pesquisar, suspender, ajustar minutos" },
    { href: "/admin/planos", label: "Planos e pacotes", desc: "Gerir planos e minutos extra" },
    { href: "/admin/viagens", label: "Viagens", desc: "Confirmar, recusar, atribuir motorista" },
    { href: "/admin/motoristas", label: "Motoristas", desc: "Criar e editar perfis" },
    { href: "/admin/pagamentos", label: "Pagamentos", desc: "Lista e confirmação demo" },
    { href: "/admin/configuracoes", label: "Configurações", desc: "Marca, tolerâncias, textos" },
  ];

  return (
    <AppShell locale={locale}>
      <PageGreeting
        hello="Administração FC"
        sub="Visão geral da operação — clientes, viagens e pagamentos."
      />

      <SummaryStrip
        items={[
          { label: "Clientes", value: String(customers) },
          { label: "Subscrições ativas", value: String(activeSubs) },
          { label: "Viagens pendentes", value: String(pendingTrips) },
        ]}
      />

      <div className="stat-grid">
        <div className="stat-card">
          <div className="label-sm">Motoristas ativos</div>
          <strong>{drivers}</strong>
        </div>
        <div className="stat-card">
          <div className="label-sm">Pagamentos pendentes</div>
          <strong>{pendingPayments}</strong>
        </div>
        <div className="stat-card">
          <div className="label-sm">Viagens hoje</div>
          <strong>{tripsToday}</strong>
        </div>
      </div>

      <h2 className="font-display" style={{ fontSize: "1.35rem", marginTop: "1.5rem" }}>
        Secções
      </h2>
      <div className="stat-grid" style={{ marginTop: "0.75rem" }}>
        {links.map((l) => (
          <Link key={l.href} href={l.href as "/admin/clientes"} className="stat-card card-interactive">
            <strong>{l.label}</strong>
            <p className="muted" style={{ margin: "0.35rem 0 0", fontSize: "0.88rem" }}>
              {l.desc}
            </p>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
