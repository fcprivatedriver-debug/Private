"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createFamilyAccountSimple,
  createSecureInvite,
  inviteMemberByEmail,
  inviteMemberByPhone,
  revokeFamilyInvite,
  resendFamilyInvite,
} from "@/actions/household";
import { formatPhoneDisplay } from "@/lib/phone";

type PendingInvite = {
  id: string;
  channel: string;
  email: string | null;
  phone: string | null;
  inviteeName: string | null;
  expiresAt: string;
  path: string;
};

export function InviteShare({
  isIndividual,
  initialInvitePath,
  pendingInvites = [],
}: {
  isIndividual: boolean;
  initialInvitePath?: string | null;
  pendingInvites?: PendingInvite[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [invitePath, setInvitePath] = useState(initialInvitePath ?? "");
  const [channel, setChannel] = useState<"EMAIL" | "PHONE">("EMAIL");
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

  function invite(form: HTMLFormElement) {
    start(async () => {
      setError(null);
      setInfo(null);
      const fd = new FormData(form);
      const res =
        channel === "EMAIL"
          ? await inviteMemberByEmail(fd)
          : await inviteMemberByPhone(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setInvitePath(res.invitePath);
      if (channel === "PHONE") {
        setInfo(
          "Convite criado. O envio por SMS ainda não está activo — partilha o link abaixo com o familiar.",
        );
      } else if (res.previewUrl && !res.delivered) {
        setInfo("Convite criado (sem entrega de email configurada — copia o link).");
      } else {
        setInfo("Convite enviado por email.");
      }
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
          Cada pessoa tem a sua própria conta. Ao criares a Família, convidas familiares
          por email (ou preparas convite por telemóvel) — nunca partilham a tua palavra-passe.
        </p>
        <button className="btn btn-primary" type="button" disabled={pending} onClick={createFamily}>
          Criar Família
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
          invite(e.currentTarget);
        }}
      >
        <p className="muted" style={{ marginTop: 0 }}>
          Convidar familiar — cada um cria/usa a sua própria conta addYknow.
        </p>
        <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="sr-only">Canal do convite</legend>
          <div className="btn-row" role="group" aria-label="Canal do convite">
            <button
              type="button"
              className={`btn btn-sm ${channel === "EMAIL" ? "btn-primary" : "btn-ghost"}`}
              aria-pressed={channel === "EMAIL"}
              onClick={() => setChannel("EMAIL")}
            >
              Email
            </button>
            <button
              type="button"
              className={`btn btn-sm ${channel === "PHONE" ? "btn-primary" : "btn-ghost"}`}
              aria-pressed={channel === "PHONE"}
              onClick={() => setChannel("PHONE")}
            >
              Telemóvel
            </button>
          </div>
        </fieldset>
        <label className="field">
          <span>Nome</span>
          <input name="name" required placeholder="João" autoComplete="name" />
        </label>
        {channel === "EMAIL" ? (
          <label className="field">
            <span>Email</span>
            <input name="email" type="email" required placeholder="joao@email.com" autoComplete="email" />
          </label>
        ) : (
          <label className="field">
            <span>Telemóvel</span>
            <input
              name="phone"
              type="tel"
              required
              placeholder="+351 912 345 678"
              autoComplete="tel"
              inputMode="tel"
            />
            <span className="muted small">
              SMS ainda não está activo — vais receber um link para partilhar.
            </span>
          </label>
        )}
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {channel === "EMAIL" ? "Enviar convite" : "Criar convite (telemóvel)"}
        </button>
      </form>

      {pendingInvites.length > 0 ? (
        <div style={{ marginTop: "1.25rem" }}>
          <p className="muted small" style={{ marginTop: 0 }}>
            Convites pendentes
          </p>
          <ul className="list-rows" style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {pendingInvites.map((inv) => (
              <li key={inv.id} className="list-row" style={{ alignItems: "flex-start" }}>
                <div className="list-row-main">
                  <strong>{inv.inviteeName || "Familiar"}</strong>
                  <span>
                    {inv.channel === "PHONE"
                      ? formatPhoneDisplay(inv.phone)
                      : inv.email || "Link"}{" "}
                    · expira {new Date(inv.expiresAt).toLocaleDateString("pt-PT")}
                  </span>
                </div>
                <div className="btn-row">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    disabled={pending}
                    onClick={() =>
                      start(async () => {
                        const res = await resendFamilyInvite(inv.id);
                        if (!res.ok) setError(res.error);
                        else {
                          setInvitePath(res.invitePath);
                          setInfo(
                            res.channel === "PHONE" || !res.delivered
                              ? "Convite actualizado — partilha o link."
                              : "Convite reenviado.",
                          );
                        }
                        router.refresh();
                      })
                    }
                  >
                    Reenviar
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger-outline btn-sm"
                    disabled={pending}
                    onClick={() =>
                      start(async () => {
                        const res = await revokeFamilyInvite(inv.id);
                        if (!res.ok) setError(res.error);
                        else setInfo("Convite cancelado.");
                        router.refresh();
                      })
                    }
                  >
                    Cancelar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

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
