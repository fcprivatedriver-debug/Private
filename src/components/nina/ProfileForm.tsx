"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateProfile } from "@/actions/household";

export function ProfileForm({
  name,
  email,
  theme,
  biometricsEnabled,
  hasPin,
  ninaReplyStyle = "auto",
  ninaHumor = "auto",
}: {
  name: string;
  email: string;
  theme: string;
  biometricsEnabled: boolean;
  hasPin: boolean;
  ninaReplyStyle?: string;
  ninaHumor?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <form
      className="form-grid"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          await updateProfile(fd);
          setMsg("Perfil atualizado. A Nina adapta-se ao teu estilo.");
          router.refresh();
        });
      }}
    >
      <label className="field">
        <span>Nome</span>
        <input name="name" defaultValue={name} required />
      </label>
      <label className="field">
        <span>Email</span>
        <input value={email} disabled readOnly />
      </label>
      <label className="field">
        <span>Tema</span>
        <select name="theme" defaultValue={theme}>
          <option value="light">Claro</option>
          <option value="dark">Escuro</option>
          <option value="system">Automático</option>
        </select>
      </label>
      <label className="field">
        <span>Como a Nina te responde</span>
        <select name="ninaReplyStyle" defaultValue={ninaReplyStyle}>
          <option value="auto">Automático (aprende contigo)</option>
          <option value="short">Respostas curtas</option>
          <option value="balanced">Equilibradas</option>
          <option value="detailed">Mais explicações</option>
        </select>
      </label>
      <label className="field">
        <span>Humor da Nina</span>
        <select name="ninaHumor" defaultValue={ninaHumor}>
          <option value="auto">Automático</option>
          <option value="light">Ligeiro (quando faz sentido)</option>
          <option value="off">Sem humor — tom sério</option>
        </select>
      </label>
      <label className="field" style={{ flexDirection: "row", alignItems: "center", gap: "0.5rem" }}>
        <input name="biometrics" type="checkbox" defaultChecked={biometricsEnabled} />
        <span>Ativar impressão digital / reconhecimento facial (neste dispositivo)</span>
      </label>
      <label className="field">
        <span>PIN {hasPin ? "(já definido — deixa em branco para manter)" : "(opcional)"}</span>
        <input name="pin" type="password" inputMode="numeric" minLength={4} placeholder="••••" />
      </label>
      <p className="muted small">
        A vida é para ser vivida. A Nina trata das contas — sem culpas, no teu ritmo, pelo caminho mais simples.
      </p>
      <button className="btn btn-primary" type="submit" disabled={pending}>
        Guardar perfil
      </button>
      {msg ? <p className="muted">{msg}</p> : null}
    </form>
  );
}
