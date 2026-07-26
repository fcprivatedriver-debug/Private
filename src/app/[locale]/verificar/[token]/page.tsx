import Link from "next/link";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { verifyEmailToken } from "@/actions/auth-account";

export default async function VerificarTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const res = await verifyEmailToken(token);

  return (
    <div className="auth-page">
      <div className="auth-card">
        <BrandLogo href="/pt" />
        {res.ok ? (
          <>
            <h1>Email confirmado</h1>
            <p className="lead">A tua conta está activa. Podes entrar na Nina.</p>
            <Link className="btn btn-primary" href="/pt/login">
              Entrar
            </Link>
          </>
        ) : (
          <>
            <h1>Link inválido</h1>
            <p className="lead">{res.error}</p>
            <Link className="btn btn-ghost" href="/pt/verificar-email">
              Pedir novo link
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
