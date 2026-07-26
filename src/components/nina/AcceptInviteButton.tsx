"use client";

import { FormEvent, useState, useTransition } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { acceptInviteSetPassword } from "@/actions/household";
import { acceptFamilyInvite } from "@/actions/household";
import { PASSWORD_HINT } from "@/lib/auth/password-rules";

export function AcceptInviteButton({
  token,
  familyName,
  loggedIn,
  inviteEmail,
  inviteeName,
}: {
  token: string;
  familyName: string;
  loggedIn: boolean;
  inviteEmail?: string | null;
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

  if (inviteEmail) {
    return (
      <form onSubmit={acceptWithPassword} className="form-grid">
        <p className="muted small" style={{ margin: 0 }}>
          Olá {inviteeName || ""} — cria só a tua palavra-passe para entrares em «{familyName}».
        </p>
        <label className="field">
          <span>Email</span>
          <input value={inviteEmail} disabled readOnly />
        </label>
        <label className="field">
          <span>Palavra-passe</span>
          <input name="password" type="password" required minLength={8} autoComplete="new-password" />
          <span className="muted small">{PASSWORD_HINT}</span>
        </label>
        <button className="btn btn-primary" type="submit" disabled={pending}>
          Entrar na família
        </button>
        {error ? <p className="form-error">{error}</p> : null}
      </form>
    );
  }

  return (
    <div>
      <p className="muted small">
        Entra ou cria conta, e depois aceita o convite.
      </p>
      <div className="btn-row">
        <Link className="btn btn-primary" href={`/pt/login?callbackUrl=${encodeURIComponent(`/pt/convite/${token}`)}`}>
          Entrar
        </Link>
        <Link className="btn btn-ghost" href={`/pt/registo?callbackUrl=${encodeURIComponent(`/pt/convite/${token}`)}`}>
          Criar conta
        </Link>
      </div>
    </div>
  );
}
