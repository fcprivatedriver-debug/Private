import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { AcceptInviteButton } from "@/components/nina/AcceptInviteButton";
import { hashInviteToken } from "@/lib/invites/tokens";
import { resolveInviteLifecycle } from "@/lib/invites/lifecycle";

export default async function ConvitePage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { token } = await params;
  const session = await auth();

  const invite = await prisma.familyInvite.findUnique({
    where: { token: hashInviteToken(token) },
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
            Ir para a MEL
          </Link>
        </div>
      </div>
    );
  }

  const sessionEmail = (session?.user?.email || "").toLowerCase() || null;
  const life = resolveInviteLifecycle({
    acceptedAt: invite.acceptedAt,
    revokedAt: invite.revokedAt,
    expiresAt: invite.expiresAt,
    inviteEmail: invite.email,
    sessionEmail,
  });
  const inviterFirst = invite.createdBy.name?.split(" ")[0] ?? "Alguém";

  return (
    <div className="auth-shell">
      <BrandLogo href="/pt" />
      <div className="auth-card">
        <p className="nina-kicker">Convite seguro · addYknow</p>
        <h1>
          {inviterFirst} convidou-te para fazeres parte da Família {invite.family.name}.
        </h1>
        <p className="muted">
          Aceitas com a tua própria conta — nunca partilhas a palavra-passe de outra pessoa.
          O teu espaço Pessoal continua só teu; o Familiar é partilhado.
        </p>
        {life.status === "ok" ? (
          <AcceptInviteButton
            token={token}
            familyName={invite.family.name}
            inviterName={inviterFirst}
            loggedIn={Boolean(session?.user)}
            inviteEmail={invite.email}
            invitePhone={invite.phone}
            inviteeName={invite.inviteeName}
          />
        ) : life.status === "wrong_email" ? (
          <div>
            <p className="text-expense">{life.message}</p>
            <Link className="btn btn-primary" href="/pt/definicoes">
              Ir às definições / terminar sessão
            </Link>
          </div>
        ) : life.status === "invalid" ? (
          <p className="text-expense">Este convite já não é válido.</p>
        ) : (
          <p className="text-expense">{life.message}</p>
        )}
      </div>
    </div>
  );
}
