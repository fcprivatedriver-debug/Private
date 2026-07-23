import type { UserRole } from "@/types";

export const roleLabels: Record<UserRole, string> = {
  client: "Cliente",
  driver: "Motorista",
  admin: "Administrador",
};

export const roleDescriptions: Record<UserRole, string> = {
  client: "Crie pedidos de viagem e escolha a melhor proposta.",
  driver: "Receba pedidos, envie propostas e gerencie a sua frota.",
  admin: "Controle a plataforma, utilizadores e comissões.",
};
