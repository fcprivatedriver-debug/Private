"use client";

import { FormEvent, useState, useTransition } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import {
  acceptInviteSetPassword,
  acceptFamilyInvite,
  declineFamilyInvite,
} from "@/actions/household";
import { PASSWORD_HINT } from "@/lib/auth/password-rules";
import { PasswordField } from "@/components/ui/PasswordField";
import { formatPhoneDisplay } from "@/lib/phone";

export function AcceptInviteButton({
  token,
  familyName,
  inviterName,
  loggedIn,
  inviteEmail,
  invitePhone,
  inviteeName,
}: {
  token: string;
  familyName: string;
  inviterName?: string;
  loggedIn: boolean;
  inviteEmail?: string | null;
  invitePhone?: string | null;
  inviteeName?: string | null;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [needsVerify, setNeedsVerify] = useState(false);
  const [declined, setDeclined] = useState(false);

  function acceptLoggedIn() {
    start(async () => {
      const res = await acceptFamilyInvite(token);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setDone(true);
      window.location.assign("/pt/dashboard");
    });
  }

  function decline() {
    start(async () => {
      const res = await declineFamilyInvite(token);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setDeclined(true);
    });
  }

  function acceptWithPassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("token", token);
    start(async () => {
      const res = await acceptInviteSetPassword(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if ("needsVerification" in res && res.needsVerification) {
        setNeedsVerify(true);
        return;
      }
      await signIn("credentials", {
        email: res.email,
        password: String(fd.get("password")),
        callbackUrl: "/pt/dashboard",
      });
    });
  }

  if (declined) {
    return <p className="muted">Convite recusado. Podes fechar esta página.</p>;
  }

  if (needsVerify) {
    return (
      <p className="muted">
        Conta criada. Confirma o teu email (link enviado) e depois volta a este convite para
        aceitar e entrar na Família {familyName}.
      </p>
    );
  }

  if (done) return <p className="muted">A entrar na {familyName}…</p>;

  if (loggedIn) {
    return (
      <div className="stack-sm">
        <div className="btn-row">
          <button className="btn btn-primary" type="button" disabled={pending} onClick={acceptLoggedIn}>
            Aceitar
          </button>
          <button className="btn btn-ghost" type="button" disabled={pending} onClick={decline}>
            Recusar
          </button>
        </div>
        {error ? <p className="form-error">{error}</p> : null}
      </div>
    );
  }

  const loginHref = `/pt/login?callbackUrl=${encodeURIComponent(`/pt/convite/${token}`)}`;

  // Email/phone invite: criar conta OU entrar se já existir
  if (inviteEmail || invitePhone) {
    return (
      <div className="stack-sm">
        <p className="muted small" style={{ margin: 0 }}>
          {inviteeName ? `Olá ${inviteeName}. ` : ""}
          {inviterName || "Alguém"} convidou-te para «{familyName}».
          {invitePhone ? ` Convite enviado para ${formatPhoneDisplay(invitePhone)}.` : null}
        </p>
        <p className="muted small">
          Já tens conta addYknow?{" "}
          <Link href={loginHref}>Entra e aceita</Link>
        </p>
        <form onSubmit={acceptWithPassword} className="form-grid">
          <p className="muted small" style={{ margin: 0 }}>
            Ainda não tens conta? Cria a tua própria conta:
          </p>
          {inviteEmail ? (
            <label className="field">
              <span>Email</span>
              <input value={inviteEmail} disabled readOnly aria-label="Email do convite" />
            </label>
          ) : (
            <label className="field">
              <span>O teu email</span>
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="o.teu@email.com"
              />
            </label>
          )}
          <PasswordField
            label="Palavra-passe"
            name="password"
            required
            minLength={8}
            autoComplete="new-password"
            hint={PASSWORD_HINT}
          />
          <div className="btn-row">
            <button className="btn btn-primary" type="submit" disabled={pending}>
              Criar conta e aceitar
            </button>
            <button className="btn btn-ghost" type="button" disabled={pending} onClick={decline}>
              Recusar
            </button>
          </div>
          {error ? <p className="form-error">{error}</p> : null}
        </form>
      </div>
    );
  }

  return (
    <div>
      <p className="muted small">Entra ou cria a tua própria conta, e depois aceita o convite.</p>
      <div className="btn-row">
        <Link className="btn btn-primary" href={loginHref}>
          Entrar
        </Link>
        <Link
          className="btn btn-ghost"
          href={`/pt/registo?callbackUrl=${encodeURIComponent(`/pt/convite/${token}`)}`}
        >
          Criar conta
        </Link>
        <button className="btn btn-ghost" type="button" disabled={pending} onClick={decline}>
          Recusar
        </button>
      </div>
      {error ? <p className="form-error">{error}</p> : null}
    </div>
  );
}
