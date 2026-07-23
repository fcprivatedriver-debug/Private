import type { Role } from "@prisma/client";

/** Post-login / authenticated home path (locale-agnostic). */
export function dashboardPathForRole(role?: Role | string | null): string {
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
