import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

export const dynamic = "force-dynamic";

export default async function DemoEmailsPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; email?: string }>;
}) {
  const { id, email } = await searchParams;

  if (id) {
    const mail = await prisma.emailLog.findUnique({ where: { id } });
    if (!mail) {
      return (
        <section className="section">
          <div className="container" style={{ maxWidth: 720 }}>
            <h1 className="page-title">Email não encontrado</h1>
            <Link href="/demo/emails">← Voltar à caixa</Link>
          </div>
        </section>
      );
    }
    return (
      <section className="section">
        <div className="container" style={{ maxWidth: 720 }}>
          <p className="muted" style={{ marginBottom: "0.75rem" }}>
            <Link href="/demo/emails">← Caixa de emails</Link>
          </p>
          <h1 className="page-title" style={{ fontSize: "1.5rem" }}>
            {mail.subject}
          </h1>
          <p className="muted" style={{ marginBottom: "1rem" }}>
            Para {mail.toEmail} · {mail.template} · {mail.channel} ·{" "}
            {format(mail.createdAt, "dd MMM yyyy HH:mm", { locale: pt })}
          </p>
          <div
            className="panel"
            style={{ padding: 0, overflow: "hidden" }}
            dangerouslySetInnerHTML={{ __html: mail.htmlBody }}
          />
        </div>
      </section>
    );
  }

  const logs = await prisma.emailLog.findMany({
    where: email ? { toEmail: email.toLowerCase() } : undefined,
    orderBy: { createdAt: "desc" },
    take: 80,
  });

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 860 }}>
        <h1 className="page-title">Caixa de emails (demo)</h1>
        <p className="page-lead">
          Todos os emails transacionais da ZRIK são registados aqui — mesmo sem Resend. Use o botão
          ATIVAR CONTA no email de verificação.
        </p>
        <p className="muted" style={{ marginBottom: "1.25rem" }}>
          <Link href="/demo-e2e" style={{ textDecoration: "underline" }}>
            Guia E2E passo a passo
          </Link>
          {" · "}
          <Link href="/registo" style={{ textDecoration: "underline" }}>
            Criar conta
          </Link>
        </p>

        {logs.length === 0 ? (
          <div className="panel">
            <p style={{ margin: 0 }}>
              Ainda não há emails. Registe uma conta ou percorra o fluxo de viagem para gerar
              notificações.
            </p>
          </div>
        ) : (
          <div className="panel" style={{ padding: 0 }}>
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {logs.map((mail) => (
                <li
                  key={mail.id}
                  style={{
                    borderBottom: "1px solid var(--line)",
                    padding: "0.9rem 1.1rem",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                    <div>
                      <Link
                        href={`/demo/emails?id=${mail.id}`}
                        style={{ fontWeight: 600, textDecoration: "none", color: "inherit" }}
                      >
                        {mail.subject}
                      </Link>
                      <div className="muted" style={{ fontSize: "0.85rem", marginTop: 4 }}>
                        {mail.toEmail} · {mail.template} · {mail.channel}
                      </div>
                    </div>
                    <div className="muted" style={{ fontSize: "0.8rem", whiteSpace: "nowrap" }}>
                      {format(mail.createdAt, "dd/MM HH:mm", { locale: pt })}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
