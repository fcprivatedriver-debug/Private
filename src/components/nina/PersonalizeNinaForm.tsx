"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateNinaPersonalization } from "@/actions/household";
import { changePassword } from "@/actions/auth-account";
import { PASSWORD_HINT } from "@/lib/auth/password-rules";
import { useTheme } from "@/components/providers/ThemeProvider";

const AVATARS = [
  { id: "classic", label: "Clássico", emoji: "✦" },
  { id: "modern", label: "Moderno", emoji: "◎" },
  { id: "minimal", label: "Minimalista", emoji: "·" },
  { id: "feminine", label: "Feminino", emoji: "♡" },
  { id: "masculine", label: "Masculino", emoji: "▴" },
] as const;

const TONES = [
  { id: "formal", label: "Formal" },
  { id: "casual", label: "Descontraída" },
  { id: "motivational", label: "Motivadora" },
  { id: "empathetic", label: "Empática" },
] as const;

const THEMES = [
  { id: "blue", label: "Azul" },
  { id: "dark", label: "Escuro" },
  { id: "light", label: "Claro" },
  { id: "green", label: "Verde" },
  { id: "purple", label: "Roxo" },
  { id: "system", label: "Automático" },
] as const;

export function PersonalizeNinaForm({
  theme,
  ninaTone,
  ninaAvatar,
  ninaVoice,
}: {
  theme: string;
  ninaTone: string;
  ninaAvatar: string;
  ninaVoice: string | null;
}) {
  const router = useRouter();
  const { setTheme } = useTheme();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [pwdMsg, setPwdMsg] = useState<string | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [avatar, setAvatar] = useState(ninaAvatar);
  const [tone, setTone] = useState(ninaTone);
  const [voice, setVoice] = useState(ninaVoice || "");
  const [themeVal, setThemeVal] = useState(theme);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const load = () => {
      const list = window.speechSynthesis.getVoices();
      const pt = list.filter((v) => /pt|portugal|brazil/i.test(v.lang) || /pt/i.test(v.name));
      setVoices(pt.length ? pt : list.slice(0, 12));
    };
    load();
    window.speechSynthesis.onvoiceschanged = load;
  }, []);

  function savePrefs() {
    start(async () => {
      const fd = new FormData();
      fd.set("theme", themeVal);
      fd.set("ninaTone", tone);
      fd.set("ninaAvatar", avatar);
      fd.set("ninaVoice", voice);
      await updateNinaPersonalization(fd);
      setTheme(themeVal as "light" | "dark" | "system" | "blue" | "green" | "purple");
      setMsg("Preferências guardadas. A Nina adapta a forma de comunicar.");
      router.refresh();
    });
  }

  function previewVoice() {
    if (!voice || typeof window === "undefined") return;
    const u = new SpeechSynthesisUtterance(
      "Olá. Sou a Nina — Controla. Poupa. Vive.",
    );
    u.lang = "pt-PT";
    const match = voices.find((v) => v.voiceURI === voice);
    if (match) u.voice = match;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }

  return (
    <div className="stack-lg">
      <section className="panel">
        <header className="panel-head">
          <h2>Avatar</h2>
        </header>
        <div className="avatar-picker">
          {AVATARS.map((a) => (
            <button
              key={a.id}
              type="button"
              className={`avatar-option ${avatar === a.id ? "active" : ""}`}
              onClick={() => setAvatar(a.id)}
            >
              <span className={`nina-avatar-bubble avatar-${a.id}`}>{a.emoji}</span>
              <span>{a.label}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="panel">
        <header className="panel-head">
          <h2>Estilo de comunicação</h2>
        </header>
        <div className="btn-row" style={{ flexWrap: "wrap" }}>
          {TONES.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`btn btn-sm ${tone === t.id ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setTone(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <p className="muted small">Altera só a forma como a Nina fala — não as funcionalidades.</p>
      </section>

      <section className="panel">
        <header className="panel-head">
          <h2>Tema</h2>
        </header>
        <div className="btn-row" style={{ flexWrap: "wrap" }}>
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`btn btn-sm ${themeVal === t.id ? "btn-primary" : "btn-ghost"}`}
              onClick={() => {
                setThemeVal(t.id);
                setTheme(t.id as "light" | "dark" | "system" | "blue" | "green" | "purple");
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </section>

      <section className="panel">
        <header className="panel-head">
          <h2>Voz (nativa do dispositivo)</h2>
        </header>
        <label className="field">
          <span>Voz do sistema</span>
          <select value={voice} onChange={(e) => setVoice(e.target.value)}>
            <option value="">Predefinição do sistema</option>
            {voices.map((v) => (
              <option key={v.voiceURI} value={v.voiceURI}>
                {v.name} ({v.lang})
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="btn btn-ghost btn-sm" onClick={previewVoice}>
          Ouvir amostra
        </button>
      </section>

      <button type="button" className="btn btn-primary" disabled={pending} onClick={savePrefs}>
        Guardar personalização
      </button>
      {msg ? <p className="muted">{msg}</p> : null}

      <section className="panel">
        <header className="panel-head">
          <h2>Alterar palavra-passe</h2>
        </header>
        <form
          className="form-grid"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            start(async () => {
              const res = await changePassword(fd);
              setPwdMsg(res.ok ? "Palavra-passe actualizada." : res.error);
              if (res.ok) e.currentTarget.reset();
            });
          }}
        >
          <label className="field">
            <span>Actual</span>
            <input name="currentPassword" type="password" required autoComplete="current-password" />
          </label>
          <label className="field">
            <span>Nova</span>
            <input name="newPassword" type="password" required minLength={8} autoComplete="new-password" />
            <span className="muted small">{PASSWORD_HINT}</span>
          </label>
          <button className="btn btn-ghost" type="submit" disabled={pending}>
            Actualizar palavra-passe
          </button>
          {pwdMsg ? <p className="muted small">{pwdMsg}</p> : null}
        </form>
      </section>
    </div>
  );
}
