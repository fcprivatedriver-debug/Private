"use client";

import { useId, useState, type InputHTMLAttributes } from "react";

type PasswordFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  label?: string;
  hint?: string;
};

/** Campo de palavra-passe com mostrar/ocultar (ícone de olho). */
export function PasswordField({
  label,
  hint,
  id,
  className,
  ...inputProps
}: PasswordFieldProps) {
  const autoId = useId();
  const inputId = id || autoId;
  const [visible, setVisible] = useState(false);

  const field = (
    <div className="password-field">
      <input
        {...inputProps}
        id={inputId}
        type={visible ? "text" : "password"}
        className={className}
      />
      <button
        type="button"
        className="password-toggle"
        aria-label={visible ? "Ocultar palavra-passe" : "Mostrar palavra-passe"}
        aria-pressed={visible}
        onClick={() => setVisible((v) => !v)}
      >
        {visible ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );

  if (!label) return field;

  return (
    <label className="field" htmlFor={inputId}>
      <span>{label}</span>
      {field}
      {hint ? <span className="muted small">{hint}</span> : null}
    </label>
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
