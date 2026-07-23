import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { AcceptInviteButton } from "@/components/nina/AcceptInviteButton";

export default async function ConvitePage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { token } = await params;
  const session = await auth();

  const invite = await prisma.familyInvite.findUnique({
    where: { token },
    include: { family: true, createdBy: { select: { name: true } } },
  });

  if (!invite) {
    return (
      <div className="auth-shell">
        <BrandLogo href="/pt" />
        <div className="auth-card">
          <h1>Convite inválido</h1>
          <p className="muted">Este link já não funciona. Pede um novo convite à família.</p>
          <Link className="btn btn-primary" href="/pt/login">
            Ir para a Nina
          </Link>
        </div>
      </div>
    );
  }

  const expired = invite.expiresAt < new Date();
  const used = Boolean(invite.acceptedAt);

  return (
    <div className="auth-shell">
      <BrandLogo href="/pt" />
      <div className="auth-card">
        <p className="nina-kicker">Convite seguro</p>
        <h1>Junta-te a {invite.family.name}</h1>
        <p className="muted">
          {invite.createdBy.name?.split(" ")[0] ?? "Alguém"} convidou-te para a Conta Familiar.
          Aceitas e ficas logo ligado — sem códigos complicados.
        </p>
        {expired || used ? (
          <p className="text-expense">
            {used ? "Este convite já foi usado." : "Este convite expirou. Pede um novo."}
          </p>
        ) : (
          <AcceptInviteButton
            token={token}
            familyName={invite.family.name}
            loggedIn={Boolean(session?.user)}
          />
        )}
        {!session?.user ? (
          <p className="muted small" style={{ marginTop: "1rem" }}>
            Ainda não tens conta?{" "}
            <Link href={`/pt/registo?callbackUrl=${encodeURIComponent(`/pt/convite/${token}`)}`}>
              Regista-te em segundos
            </Link>
          </p>
        ) : null}
      </div>
    </div>
  );
}
