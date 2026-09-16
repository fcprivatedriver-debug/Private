"use client";

import { FormEvent, useState, useTransition } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { acceptInviteSetPassword, acceptFamilyInvite } from "@/actions/household";
import { PASSWORD_HINT } from "@/lib/auth/password-rules";
import { PasswordField } from "@/components/ui/PasswordField";
import { formatPhoneDisplay } from "@/lib/phone";

export function AcceptInviteButton({
  token,
  familyName,
  loggedIn,
  inviteEmail,
  invitePhone,
  inviteeName,
}: {
  token: string;
  familyName: string;
  loggedIn: boolean;
  inviteEmail?: string | null;
  invitePhone?: string | null;
  inviteeName?: string | null;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

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
      await signIn("credentials", {
        email: res.email,
        password: String(fd.get("password")),
        callbackUrl: "/pt/dashboard",
      });
    });
  }

  if (done) return <p className="muted">A entrar na {familyName}…</p>;

  if (loggedIn) {
    return (
      <div>
        <button className="btn btn-primary" type="button" disabled={pending} onClick={acceptLoggedIn}>
          Aceitar convite
        </button>
        {error ? <p className="form-error">{error}</p> : null}
      </div>
    );
  }

  // Email invite: email locked; phone invite: ask for email to create own account
  if (inviteEmail || invitePhone) {
    return (
      <form onSubmit={acceptWithPassword} className="form-grid">
        <p className="muted small" style={{ margin: 0 }}>
          Olá {inviteeName || ""} — cria a tua própria conta para entrares em «{familyName}».
          {invitePhone ? ` Convite enviado para ${formatPhoneDisplay(invitePhone)}.` : null}
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
        <button className="btn btn-primary" type="submit" disabled={pending}>
          Entrar na família
        </button>
        {error ? <p className="form-error">{error}</p> : null}
      </form>
    );
  }

  return (
    <div>
      <p className="muted small">Entra ou cria a tua própria conta, e depois aceita o convite.</p>
      <div className="btn-row">
        <Link
          className="btn btn-primary"
          href={`/pt/login?callbackUrl=${encodeURIComponent(`/pt/convite/${token}`)}`}
        >
          Entrar
        </Link>
        <Link
          className="btn btn-ghost"
          href={`/pt/registo?callbackUrl=${encodeURIComponent(`/pt/convite/${token}`)}`}
        >
          Criar conta
        </Link>
      </div>
    </div>
  );
}
