/** Rotas pós-login e helpers de autenticação. */

export const APP_HOME = "/hoje";

export function dashboardPath(): string {
  return APP_HOME;
}

export function safePostLoginPath(
  callbackUrl: string | null | undefined,
  locale = "pt",
): string {
  const fallback = `/${locale}${APP_HOME}`;
  if (!callbackUrl) return fallback;
  try {
    if (callbackUrl.startsWith(`/${locale}/`)) {
      const path = callbackUrl.slice(locale.length + 1);
      if (path.startsWith("/login") || path.startsWith("/registo")) return fallback;
      return callbackUrl;
    }
    if (callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")) {
      return `/${locale}${callbackUrl}`;
    }
  } catch {
    /* ignore */
  }
  return fallback;
}
