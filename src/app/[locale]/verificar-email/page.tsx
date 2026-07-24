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
          <p className="page-lead">
            Abra o email que lhe enviámos e clique em <strong>ATIVAR CONTA</strong>.
          </p>
          <p className="muted">
            <Link href="/login" style={{ textDecoration: "underline" }}>
              Voltar ao login
            </Link>
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
            <Link href="/registo" style={{ textDecoration: "underline" }}>
              Criar conta
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
      </div>
    </section>
  );
}
