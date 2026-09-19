/** Ícones de traço fino para acções do dashboard — estilo alinhado a PasswordField. */
const stroke = {
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg
      className="dash-action-icon"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      aria-hidden
    >
      {children}
    </svg>
  );
}

export function DashExpenseIcon() {
  return (
    <Icon>
      <circle {...stroke} cx="12" cy="12" r="8.5" />
      <path {...stroke} d="M8 12h8" />
    </Icon>
  );
}

export function DashIncomeIcon() {
  return (
    <Icon>
      <circle {...stroke} cx="12" cy="12" r="8.5" />
      <path {...stroke} d="M12 8v8M8 12h8" />
    </Icon>
  );
}

export function DashScheduleIcon() {
  return (
    <Icon>
      <rect {...stroke} x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path {...stroke} d="M8 3.5v3M16 3.5v3M3.5 10h17" />
    </Icon>
  );
}

export function DashMobilityIcon() {
  return (
    <Icon>
      <path
        {...stroke}
        d="M5 16.5h14l-1.2-6.2A2 2 0 0 0 15.85 9H8.15a2 2 0 0 0-1.95 1.3L5 16.5Z"
      />
      <path {...stroke} d="M7.5 16.5v1.8M16.5 16.5v1.8M8 12h8" />
      <circle {...stroke} cx="8.2" cy="16.5" r="1.2" />
      <circle {...stroke} cx="15.8" cy="16.5" r="1.2" />
    </Icon>
  );
}

export function DashShoppingIcon() {
  return (
    <Icon>
      <path
        {...stroke}
        d="M6.5 9h11l-.9 9.2a1.6 1.6 0 0 1-1.6 1.4H9a1.6 1.6 0 0 1-1.6-1.4L6.5 9Z"
      />
      <path {...stroke} d="M9 9a3 3 0 0 1 6 0" />
    </Icon>
  );
}
