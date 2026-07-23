import type { UserRole } from "@/types";

export interface NavItem {
  title: string;
  href: string;
  description?: string;
  icon?: string;
}

export const marketingNav: NavItem[] = [
  { title: "Como funciona", href: "/como-funciona" },
  { title: "Para motoristas", href: "/para-motoristas" },
  { title: "Contactos", href: "/contactos" },
];

export const clientNav: NavItem[] = [
  { title: "Painel", href: "/cliente/painel", icon: "LayoutDashboard" },
  { title: "Viagens", href: "/cliente/viagens", icon: "MapPinned" },
  { title: "Propostas", href: "/cliente/propostas", icon: "FileText" },
  { title: "Notificações", href: "/cliente/notificacoes", icon: "Bell" },
  { title: "Perfil", href: "/cliente/perfil", icon: "User" },
];

export const driverNav: NavItem[] = [
  { title: "Painel", href: "/motorista/painel", icon: "LayoutDashboard" },
  { title: "Pedidos", href: "/motorista/pedidos", icon: "MapPinned" },
  { title: "Propostas", href: "/motorista/propostas", icon: "FileText" },
  { title: "Veículos", href: "/motorista/veiculos", icon: "Car" },
  { title: "Ganhos", href: "/motorista/ganhos", icon: "Wallet" },
  { title: "Notificações", href: "/motorista/notificacoes", icon: "Bell" },
  { title: "Perfil", href: "/motorista/perfil", icon: "User" },
];

export const adminNav: NavItem[] = [
  { title: "Painel", href: "/admin/painel", icon: "LayoutDashboard" },
  { title: "Utilizadores", href: "/admin/utilizadores", icon: "Users" },
  { title: "Motoristas", href: "/admin/motoristas", icon: "IdCard" },
  { title: "Viagens", href: "/admin/viagens", icon: "MapPinned" },
  { title: "Veículos", href: "/admin/veiculos", icon: "Car" },
  { title: "Comissões", href: "/admin/comissoes", icon: "Percent" },
  { title: "Definições", href: "/admin/definicoes", icon: "Settings" },
];

export const roleHomePath: Record<UserRole, string> = {
  client: "/cliente/painel",
  driver: "/motorista/painel",
  admin: "/admin/painel",
};

export function getNavForRole(role: UserRole): NavItem[] {
  switch (role) {
    case "client":
      return clientNav;
    case "driver":
      return driverNav;
    case "admin":
      return adminNav;
  }
}
