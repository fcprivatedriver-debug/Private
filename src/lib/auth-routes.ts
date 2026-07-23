/** Rotas protegidas da Nina */
export const APP_PROTECTED_PREFIXES = [
  "/dashboard",
  "/receitas",
  "/despesas",
  "/orcamentos",
  "/objetivos",
  "/estatisticas",
  "/pesquisa",
  "/familia",
  "/recorrentes",
  "/importacoes",
  "/alertas",
  "/definicoes",
  "/ocr",
  "/ia",
] as const;

export function dashboardPathForRole(role?: string): string {
  void role;
  return "/dashboard";
}

export function safePostLoginPath(
  _role: string | null | undefined,
  callbackUrl: string | null,
  locale: string,
): string {
  if (callbackUrl && callbackUrl.startsWith(`/${locale}/`)) {
    const path = callbackUrl.slice(locale.length + 1);
    if (APP_PROTECTED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) {
      return callbackUrl;
    }
  }
  return `/${locale}/dashboard`;
}
