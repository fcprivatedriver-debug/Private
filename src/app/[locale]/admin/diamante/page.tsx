import { Link } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { AppShell } from "@/components/layout/AppShell";
import { PageGreeting } from "@/components/ui/PageGreeting";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/db";
import { DIAMOND_STATUS_LABELS } from "@/config/plans";
import { DiamondAdminActions } from "@/components/admin/DiamondAdminActions";

export const dynamic = "force-dynamic";

export default async function AdminDiamantePage() {
  await requireRole(["ADMIN"]);
  const locale = await getLocale();

  const proposals = await prisma.diamondProposal.findMany({
    orderBy: { createdAt: "desc" },
    include: { convertedPlan: true },
  });

  const counts = proposals.reduce(
    (acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <AppShell locale={locale}>
      <PageGreeting
        hello="Clientes Diamante"
        sub="Propostas personalizadas — empresas, hotéis, clínicas e necessidades específicas."
      />

      <div className="stat-grid" style={{ marginBottom: "1.25rem" }}>
        {Object.entries(DIAMOND_STATUS_LABELS).map(([key, label]) => (
          <div key={key} className="stat-card">
            <div className="label-sm">{label}</div>
            <strong>{counts[key] || 0}</strong>
          </div>
        ))}
      </div>

      <p style={{ marginBottom: "1rem" }}>
        <Link href="/admin" className="muted" style={{ textDecoration: "underline" }}>
          ← Administração
        </Link>
      </p>

      <div style={{ display: "grid", gap: "1rem" }}>
        {proposals.length === 0 && (
          <div className="card-soft">
            <p className="muted" style={{ margin: 0 }}>
              Ainda não existem pedidos Diamante.
            </p>
          </div>
        )}

        {proposals.map((p) => (
          <article key={p.id} className="card-soft" style={{ display: "grid", gap: "0.75rem" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "1rem",
                flexWrap: "wrap",
                alignItems: "baseline",
              }}
            >
              <div>
                <h2 style={{ margin: 0, fontSize: "1.2rem" }}>
                  💎 {p.name}
                  {p.company ? ` · ${p.company}` : ""}
                </h2>
                <p className="muted" style={{ margin: "0.25rem 0 0", fontSize: "0.88rem" }}>
                  {p.email} · {p.phone} ·{" "}
                  {format(p.createdAt, "d MMM yyyy HH:mm", { locale: pt })}
                </p>
              </div>
              <span className="badge">{DIAMOND_STATUS_LABELS[p.status] || p.status}</span>
            </div>

            <div className="muted" style={{ fontSize: "0.9rem", display: "grid", gap: "0.25rem" }}>
              <div>Utilizadores estimados: {p.estimatedUsers ?? "—"}</div>
              <div>Viagens/semana: {p.tripsPerWeek ?? "—"}</div>
              <div>Horários: {p.usualHours || "—"}</div>
              <div>Zona: {p.serviceZone || "—"}</div>
              {p.notes && <div>Observações: {p.notes}</div>}
              {p.convertedPlan && (
                <div>
                  Plano criado: <strong>{p.convertedPlan.namePt}</strong> (
                  {(p.convertedPlan.priceCents / 100).toFixed(0)} € · {p.convertedPlan.monthlyMinutes}{" "}
                  min)
                </div>
              )}
            </div>

            <DiamondAdminActions proposal={p} />
          </article>
        ))}
      </div>
    </AppShell>
  );
}
