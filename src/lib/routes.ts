import type { Role } from "@prisma/client";

export function homePathForRole(role?: Role | string | null): string {
  switch (role) {
    case "CUSTOMER":
      return "/pedidos";
    case "DRIVER":
      return "/painel";
    case "ADMIN":
      return "/admin";
    default:
      return "/";
  }
}
