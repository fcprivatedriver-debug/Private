export type AccountMode = "CUSTOMER" | "DRIVER";

export type AccountCapabilities = {
  hasCustomer: boolean;
  hasDriver: boolean;
  activeMode: AccountMode;
  role: "CUSTOMER" | "DRIVER" | "ADMIN";
};

/** Resolve which experience mode the user is in. */
export function resolveActiveMode(input: {
  role?: string | null;
  hasCustomer?: boolean;
  hasDriver?: boolean;
  preferred?: string | null;
}): AccountMode {
  const preferred =
    input.preferred === "DRIVER" || input.preferred === "CUSTOMER"
      ? input.preferred
      : null;

  if (input.role === "ADMIN") return "CUSTOMER";

  if (preferred) {
    if (preferred === "DRIVER" && input.hasDriver) return "DRIVER";
    if (preferred === "CUSTOMER" && (input.hasCustomer || !input.hasDriver)) {
      return "CUSTOMER";
    }
  }

  if (input.role === "DRIVER" && input.hasDriver) return "DRIVER";
  return "CUSTOMER";
}

export function modeDashboardPath(mode: AccountMode): string {
  return mode === "DRIVER" ? "/painel" : "/pedidos/novo";
}
