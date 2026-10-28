"use client";

import { useId, useState, type InputHTMLAttributes } from "react";
import { passwordCheckState } from "@/lib/auth/password-rules";

type PasswordFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  label?: string;
  hint?: string;
  /** Lista viva dos requisitos, sem enviar a palavra-passe para fora. */
  showRules?: boolean;
};

/** Campo de palavra-passe com mostrar/ocultar (ícone de olho). */
export function PasswordField({
  label,
  hint,
  id,
  className,
  autoComplete,
  name = "password",
  showRules = false,
  defaultValue,
  value,
  onChange,
  ...inputProps
}: PasswordFieldProps) {
  const autoId = useId();
  const inputId = id || autoId;
  const rulesId = `${inputId}-rules`;
  const [visible, setVisible] = useState(false);
  const [draft, setDraft] = useState(String(value ?? defaultValue ?? ""));
  const showLabel = visible ? "Ocultar palavra-passe" : "Mostrar palavra-passe";
  const checks = showRules ? passwordCheckState(value != null ? String(value) : draft) : [];

  const field = (
    <div className="password-field">
      <input
        {...inputProps}
        id={inputId}
        name={name}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        className={className}
        defaultValue={value == null ? defaultValue : undefined}
        value={value}
        aria-describedby={showRules ? rulesId : undefined}
        onChange={(event) => {
          setDraft(event.target.value);
          onChange?.(event);
        }}
        // Não bloquear colar / gestores de passwords
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
      />
      <button
        type="button"
        className="password-toggle"
        aria-label={showLabel}
        title={showLabel}
        aria-pressed={visible}
        aria-controls={inputId}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setVisible((v) => !v);
        }}
      >
        {visible ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );

  if (!label) {
    return (
      <>
        {field}
        {showRules ? <PasswordRules id={rulesId} checks={checks} /> : null}
      </>
    );
  }

  return (
    <label className="field" htmlFor={inputId}>
      <span>{label}</span>
      {field}
      {hint ? <span className="muted small">{hint}</span> : null}
      {showRules ? <PasswordRules id={rulesId} checks={checks} /> : null}
    </label>
  );
}

function PasswordRules({
  id,
  checks,
}: {
  id: string;
  checks: { id: string; label: string; met: boolean }[];
}) {
  return (
    <ul id={id} className="password-rules" aria-live="polite">
      {checks.map((rule) => (
        <li key={rule.id} data-met={rule.met ? "yes" : "no"}>
          <span className="password-rules-mark" aria-hidden>
            {rule.met ? "✓" : "○"}
          </span>
          <span>
            {rule.met ? "Cumprido: " : "Em falta: "}
            {rule.label}
          </span>
        </li>
      ))}
    </ul>
  );
}

function EyeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 3l18 18M10.6 10.6A3 3 0 0 0 12 15a3 3 0 0 0 2.4-1.2M9.9 5.2A11 11 0 0 1 12 5c6.5 0 10 7 10 7a18 18 0 0 1-4.1 4.7M6.1 6.1A18 18 0 0 0 2 12s3.5 7 10 7a11 11 0 0 0 4.2-.8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
