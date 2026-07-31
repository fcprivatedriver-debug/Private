import { getLocale } from "next-intl/server";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { AppShell } from "@/components/layout/AppShell";
import { PageGreeting } from "@/components/ui/PageGreeting";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  AdjustMinutesForm,
  SuspendButton,
  ResendActivationButton,
} from "@/components/admin/CustomerAdminTools";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/db";
import { availableMinutes, formatMinutes } from "@/lib/utils";
import { SUBSCRIPTION_STATUS_LABELS } from "@/config/constants";

export default async function AdminClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireRole(["ADMIN"]);
  const locale = await getLocale();
  const { q } = await searchParams;

  const customers = await prisma.user.findMany({
    where: {
      role: "CUSTOMER",
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      customerProfile: { include: { travelHabits: true } },
      subscriptions: {
        where: { status: "ACTIVE" },
        take: 1,
        include: { plan: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <AppShell locale={locale}>
      <PageGreeting hello="Clientes" sub="Pesquisar, suspender contas e ajustar minutos." />

      <form className="panel" style={{ marginBottom: "1.25rem" }}>
        <div className="field" style={{ marginBottom: 0 }}>
          <label className="label" htmlFor="q">
            Pesquisar
          </label>
          <input className="input" id="q" name="q" defaultValue={q || ""} placeholder="Nome ou e-mail" />
        </div>
        <button type="submit" className="btn btn-secondary btn-sm" style={{ marginTop: "0.75rem" }}>
          Pesquisar
        </button>
      </form>

      <div className="list-stack">
        {customers.map((c) => {
          const sub = c.subscriptions[0];
          const habits = c.customerProfile?.travelHabits;
          const verified = Boolean(c.emailVerified);
          return (
            <div key={c.id} className="list-item panel" style={{ cursor: "default" }}>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
                <div>
                  <strong>{c.name}</strong>
                  <div className="muted">{c.email}</div>
                  <div style={{ marginTop: "0.35rem", fontSize: "0.88rem" }}>
                    {verified ? (
                      <span className="badge" style={{ background: "#e6f4ea", color: "#1b5e20" }}>
                        E-mail confirmado ·{" "}
                        {format(c.emailVerified!, "d MMM yyyy HH:mm", { locale: pt })}
                      </span>
                    ) : (
                      <span className="badge" style={{ background: "#fff3e0", color: "#e65100" }}>
                        E-mail por confirmar
                      </span>
                    )}
                    <span className="muted" style={{ marginLeft: "0.5rem" }}>
                      Estado: {c.status}
                    </span>
                  </div>
                </div>
                <SuspendButton userId={c.id} suspended={c.status === "SUSPENDED"} />
              </div>

              {!verified && <ResendActivationButton userId={c.id} />}

              {sub && (
                <p className="muted" style={{ margin: "0.5rem 0 0" }}>
                  {sub.plan.namePt} · {SUBSCRIPTION_STATUS_LABELS[sub.status]} ·{" "}
                  {formatMinutes(availableMinutes(sub))} disponíveis
                </p>
              )}

              {habits && (
                <details style={{ marginTop: "0.75rem" }}>
                  <summary className="label-sm" style={{ cursor: "pointer" }}>
                    Hábitos de deslocação
                  </summary>
                  <p className="muted" style={{ marginTop: "0.35rem", fontSize: "0.88rem" }}>
                    {habits.usualPickups || "—"} → {habits.usualDestinations || "—"}
                    {habits.oftenAirport && " · Aeroporto"}
                    {habits.needsWaiting && " · Espera"}
                  </p>
                </details>
              )}

              {sub && <AdjustMinutesForm userId={c.id} userName={c.name} />}
            </div>
          );
        })}
        {customers.length === 0 && <EmptyState title="Nenhum cliente" body="Ajuste a pesquisa ou aguarde registos." />}
      </div>
    </AppShell>
  );
}
