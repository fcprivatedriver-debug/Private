import { getLocale } from "next-intl/server";
import { AppShell } from "@/components/layout/AppShell";
import { PageGreeting } from "@/components/ui/PageGreeting";
import { EmptyState } from "@/components/ui/EmptyState";
import { PaymentsAdminList } from "@/components/admin/PaymentsAdminList";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/db";
import { Link } from "@/i18n/navigation";

export default async function AdminPagamentosPage() {
  await requireRole(["ADMIN"]);
  const locale = await getLocale();

  const payments = await prisma.payment.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { user: { select: { name: true, email: true } } },
  });

  return (
    <AppShell locale={locale}>
      <PageGreeting hello="Pagamentos" sub="Lista de cobranças e confirmação em modo demonstração." />
      <p className="muted" style={{ marginBottom: "1rem" }}>
        <Link href="/admin">← Administração</Link>
      </p>

      {payments.length === 0 ? (
        <EmptyState title="Sem pagamentos" body="Os pagamentos aparecem aqui." />
      ) : (
        <PaymentsAdminList
          payments={payments.map((p) => ({
            id: p.id,
            amountCents: p.amountCents,
            status: p.status,
            method: p.method,
            kind: p.kind,
            createdAt: p.createdAt.toISOString(),
            userName: p.user.name,
            userEmail: p.user.email,
          }))}
        />
      )}
    </AppShell>
  );
}
