import { Link } from "@/i18n/navigation";
import { verifyEmailAction } from "@/actions/marketplace";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <section className="auth-shell fade-up">
        <div className="container" style={{ maxWidth: 520 }}>
          <h1 className="page-title">Ativar conta</h1>
          <p className="page-lead">Abra o link ATIVAR CONTA que recebeu por email.</p>
          <p className="muted">
            Em modo demo, veja a{" "}
            <Link href="/demo/emails" style={{ textDecoration: "underline" }}>
              caixa de emails
            </Link>
            .
          </p>
        </div>
      </section>
    );
  }

  const result = await verifyEmailAction(token);

  if (!result.ok) {
    return (
      <section className="auth-shell fade-up">
        <div className="container" style={{ maxWidth: 520 }}>
          <h1 className="page-title">Não foi possível ativar</h1>
          <div className="alert alert-error">{result.error}</div>
          <p className="muted" style={{ marginTop: "1rem" }}>
            <Link href="/demo/emails" style={{ textDecoration: "underline" }}>
              Abrir caixa de emails demo
            </Link>
            {" · "}
            <Link href="/login" style={{ textDecoration: "underline" }}>
              Entrar
            </Link>
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="auth-shell fade-up">
      <div className="container" style={{ maxWidth: 520 }}>
        <h1 className="page-title">Conta ativada</h1>
        <p className="page-lead">
          O email <strong>{result.email}</strong> foi confirmado. Já pode iniciar sessão.
        </p>
        <Link href="/login" className="btn btn-primary">
          Entrar
        </Link>
        <p className="muted" style={{ marginTop: "1.25rem" }}>
          Enviámos também o email de confirmação — consulte a{" "}
          <Link href="/demo/emails" style={{ textDecoration: "underline" }}>
            caixa demo
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
