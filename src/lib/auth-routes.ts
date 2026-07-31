/** Roles da app — string union (sem Prisma) para ser seguro no Edge middleware. */
export type AppRole = "CUSTOMER" | "DRIVER" | "ADMIN";
export type AppMode = "CUSTOMER" | "DRIVER";

/** Destino pós-login / home autenticada (path sem locale). */
export function dashboardPathForRole(role?: AppRole | string | null): string {
  switch (role) {
    case "DRIVER":
      return "/painel";
    case "ADMIN":
      return "/admin";
    case "CUSTOMER":
      return "/pedidos/novo";
    default:
      return "/";
  }
}

export function dashboardPathForMode(mode?: AppMode | string | null, role?: string | null): string {
  if (role === "ADMIN") return "/admin";
  if (mode === "DRIVER") return "/painel";
  if (mode === "CUSTOMER") return "/pedidos/novo";
  return dashboardPathForRole(role);
}

type AccessContext = {
  role?: string | null;
  activeMode?: string | null;
  hasCustomer?: boolean;
  hasDriver?: boolean;
};

/** Whether an authenticated account may open this absolute path. */
export function canRoleAccessPath(
  role: string | undefined | null,
  pathname: string,
  ctx?: AccessContext,
): boolean {
  const path = pathname.replace(/^\/(pt|en)(?=\/|$)/, "") || "/";
  const normalized = path.startsWith("/") ? path : `/${path}`;

  if (normalized === "/" || normalized === "") return true;
  if (normalized.startsWith("/login") || normalized.startsWith("/registo")) return true;
  if (normalized.startsWith("/como-funciona") || normalized.startsWith("/para-motoristas")) {
    return true;
  }
  if (normalized.startsWith("/tornar-motorista")) return true;
  if (normalized.startsWith("/termos") || normalized.startsWith("/privacidade")) return true;
  if (normalized.startsWith("/motoristas/") || normalized.startsWith("/veiculos/")) return true;

  if (!role) return false;
  if (role === "ADMIN") return true;

  const mode = ctx?.activeMode || (role === "DRIVER" ? "DRIVER" : "CUSTOMER");
  const hasCustomer = ctx?.hasCustomer ?? role === "CUSTOMER";
  const hasDriver = ctx?.hasDriver ?? role === "DRIVER";

  if (normalized.startsWith("/pedidos/novo")) return hasCustomer || mode === "CUSTOMER";
  if (normalized.startsWith("/pedidos")) return hasCustomer || hasDriver || role === "ADMIN";
  if (normalized.startsWith("/painel")) return hasDriver;
  if (normalized.startsWith("/pedidos-abertos")) return hasDriver;
  if (normalized.startsWith("/propostas")) return hasDriver;
  if (normalized === "/veiculo" || normalized.startsWith("/veiculo/")) return hasDriver;
  if (normalized.startsWith("/viagens")) return hasDriver;
  if (normalized.startsWith("/onboarding")) return hasDriver;
  if (normalized.startsWith("/admin")) return role === "ADMIN";

  return true;
}

/**
 * Pós-login: só honra callbackUrl se a conta puder aceder.
 */
export function safePostLoginPath(
  role: string | undefined | null,
  callbackUrl: string | null | undefined,
  locale: string,
  ctx?: AccessContext,
): string {
  if (callbackUrl) {
    try {
      const url = callbackUrl.startsWith("http")
        ? new URL(callbackUrl)
        : new URL(callbackUrl, "http://local.invalid");
      const pathname = url.pathname;
      if (canRoleAccessPath(role, pathname, ctx)) {
        return pathname.startsWith(`/${locale}`)
          ? pathname
          : `/${locale}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
      }
    } catch {
      /* ignore bad callback */
    }
  }
  const dest = dashboardPathForMode(ctx?.activeMode, role);
  return `/${locale}${dest === "/" ? "" : dest}`;
}
