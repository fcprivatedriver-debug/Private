import type { Role } from "@prisma/client";

/** Home path after login for each role (Cliente + Administrador only). */
export function dashboardPathForRole(role: Role | string): string {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "CUSTOMER":
    default:
      return "/cliente";
  }
}
