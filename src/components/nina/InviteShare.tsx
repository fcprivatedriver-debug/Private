"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createFamilyAccountSimple,
  createSecureInvite,
  inviteMemberByEmail,
} from "@/actions/household";

export function InviteShare({
  isIndividual,
  initialInvitePath,
}: {
  isIndividual: boolean;
  initialInvitePath?: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [invitePath, setInvitePath] = useState(initialInvitePath ?? "");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const absolute =
    typeof window !== "undefined" && invitePath
      ? `${window.location.origin}${invitePath}`
      : invitePath
        ? invitePath
        : "";

  const qrUrl = absolute
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(absolute)}`
    : null;

  function createFamily() {
    start(async () => {
      setError(null);
      const res = await createFamilyAccountSimple();
      if (res.ok) {
        setInvitePath(res.invitePath);
        router.refresh();
      }
    });
  }

  function newInvite() {
    start(async () => {
      setError(null);
      const res = await createSecureInvite();
      if (res.ok) {
        setInvitePath(res.invitePath);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  function inviteEmail(form: HTMLFormElement) {
    start(async () => {
      setError(null);
      setInfo(null);
      const fd = new FormData(form);
      const res = await inviteMemberByEmail(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setInvitePath(res.invitePath);
      setInfo(
        res.previewUrl
          ? "Convite criado (sem servidor de email — copia o link)."
          : "Convite enviado por email.",
      );
      if (res.previewUrl) setInvitePath(res.invitePath);
      form.reset();
      router.refresh();
    });
  }

  async function copyLink() {
    if (!absolute) return;
    try {
      await navigator.clipboard.writeText(absolute);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Não foi possível copiar. Copia o link manualmente.");
    }
  }

  if (isIndividual && !invitePath) {
    return (
      <div className="invite-share">
        <p className="muted" style={{ marginTop: 0 }}>
          Com um toque crias a Conta Familiar e podes convidar membros por email.
        </p>
        <button className="btn btn-primary" type="button" disabled={pending} onClick={createFamily}>
          Criar Conta Familiar
        </button>
      </div>
    );
  }

  return (
    <div className="invite-share">
      <form
        className="form-grid"
        onSubmit={(e) => {
          e.preventDefault();
          inviteEmail(e.currentTarget);
        }}
      >
        <p className="muted" style={{ marginTop: 0 }}>
          Adicionar membro — a Nina envia o convite. Ao aceitar, só cria a palavra-passe.
        </p>
        <label className="field">
          <span>Nome</span>
          <input name="name" required placeholder="Ana" />
        </label>
        <label className="field">
          <span>Email</span>
          <input name="email" type="email" required placeholder="ana@email.com" />
        </label>
        <button className="btn btn-primary" type="submit" disabled={pending}>
          Enviar convite
        </button>
      </form>

      {invitePath ? (
        <>
          <p className="muted small" style={{ marginTop: "1.25rem" }}>
            Ou partilha o link / QR:
          </p>
          <div className="invite-link-row">
            <input readOnly value={absolute || invitePath} aria-label="Link de convite" />
            <button className="btn btn-primary btn-sm" type="button" onClick={copyLink}>
              {copied ? "Copiado" : "Copiar"}
            </button>
          </div>
          {qrUrl ? (
            <div className="invite-qr">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrUrl} alt="QR Code do convite familiar" width={220} height={220} />
            </div>
          ) : null}
        </>
      ) : null}
      <button className="btn btn-ghost btn-sm" type="button" disabled={pending} onClick={newInvite}>
        Gerar link genérico
      </button>
      {info ? <p className="muted small">{info}</p> : null}
      {error ? <p className="text-expense small">{error}</p> : null}
    </div>
  );
}
