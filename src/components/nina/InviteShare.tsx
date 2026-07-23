"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createFamilyAccountSimple,
  createSecureInvite,
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
          Com um toque crias a Conta Familiar e a Nina gera um convite seguro para enviares.
        </p>
        <button className="btn btn-primary" type="button" disabled={pending} onClick={createFamily}>
          Criar Conta Familiar
        </button>
        <p className="muted small">Demora segundos. Sem códigos complicados.</p>
      </div>
    );
  }

  return (
    <div className="invite-share">
      <p className="muted" style={{ marginTop: 0 }}>
        Envia este link (ou o QR) a quem queres adicionar. Ao aceitar, fica logo na mesma Conta Familiar.
      </p>
      {invitePath ? (
        <>
          <div className="invite-link-row">
            <input readOnly value={absolute || invitePath} aria-label="Link de convite" />
            <button className="btn btn-primary btn-sm" type="button" onClick={copyLink}>
              {copied ? "Copiado" : "Copiar"}
            </button>
          </div>
          {qrUrl ? (
            <div className="invite-qr">
              {/* QR gerado por serviço externo — sem configuração técnica */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrUrl} alt="QR Code do convite familiar" width={220} height={220} />
            </div>
          ) : null}
        </>
      ) : (
        <p className="muted small">Ainda sem convite ativo.</p>
      )}
      <button className="btn btn-ghost btn-sm" type="button" disabled={pending} onClick={newInvite}>
        Gerar novo convite
      </button>
      {error ? <p className="text-expense small">{error}</p> : null}
    </div>
  );
}
