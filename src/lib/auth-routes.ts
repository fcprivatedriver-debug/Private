/** Roles da app — string union (sem Prisma) para ser seguro no Edge middleware. */
export type AppRole = "CUSTOMER" | "DRIVER" | "ADMIN";

/** Destino pós-login / home autenticada (path sem locale). */
export function dashboardPathForRole(role?: AppRole | string | null): string {
  switch (role) {
    case "DRIVER":
      return "/painel";
    case "ADMIN":
      return "/admin";
    case "CUSTOMER":
      return "/pedidos";
    default:
      return "/";
  }
}

/** Whether an authenticated role may open this absolute path (with or without locale). */
export function canRoleAccessPath(role: string | undefined | null, pathname: string): boolean {
  const path = pathname.replace(/^\/(pt|en)(?=\/|$)/, "") || "/";
  const normalized = path.startsWith("/") ? path : `/${path}`;

  if (normalized === "/" || normalized === "") return true;
  if (normalized.startsWith("/login") || normalized.startsWith("/registo")) return true;
  if (normalized.startsWith("/como-funciona") || normalized.startsWith("/para-motoristas")) {
    return true;
  }
  if (normalized.startsWith("/termos") || normalized.startsWith("/privacidade")) return true;
  if (normalized.startsWith("/motoristas/") || normalized.startsWith("/veiculos/")) return true;

  if (!role) return false;

  if (normalized.startsWith("/pedidos/novo")) return role === "CUSTOMER";
  if (normalized.startsWith("/pedidos")) return ["CUSTOMER", "DRIVER", "ADMIN"].includes(role);
  if (normalized.startsWith("/painel")) return role === "DRIVER";
  if (normalized.startsWith("/pedidos-abertos")) return role === "DRIVER";
  if (normalized.startsWith("/propostas")) return role === "DRIVER";
  if (normalized === "/veiculo" || normalized.startsWith("/veiculo/")) return role === "DRIVER";
  if (normalized.startsWith("/viagens")) return role === "DRIVER";
  if (normalized.startsWith("/onboarding")) return role === "DRIVER";
  if (normalized.startsWith("/admin")) return role === "ADMIN";

  return true;
}

/**
 * Pós-login: só honra callbackUrl se o role puder aceder.
 * Evita loops (ex.: CUSTOMER com callbackUrl=/pt/painel).
 */
export function safePostLoginPath(
  role: string | undefined | null,
  callbackUrl: string | null | undefined,
  locale: string,
): string {
  if (callbackUrl) {
    try {
      const url = callbackUrl.startsWith("http")
        ? new URL(callbackUrl)
        : new URL(callbackUrl, "http://local.invalid");
      const pathname = url.pathname;
      if (canRoleAccessPath(role, pathname)) {
        return pathname.startsWith(`/${locale}`)
          ? pathname
          : `/${locale}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
      }
    } catch {
      /* ignore bad callback */
    }
  }
  const dest = dashboardPathForRole(role);
  return `/${locale}${dest === "/" ? "" : dest}`;
}
