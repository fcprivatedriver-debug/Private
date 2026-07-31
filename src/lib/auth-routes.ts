import type { Role } from "@prisma/client";

export function dashboardPathForRole(role: Role | string) {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "DRIVER":
      return "/motorista";
    default:
      return "/cliente";
  }
}
