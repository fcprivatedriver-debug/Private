"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/pt/hoje", label: "Hoje" },
  { href: "/pt/captura", label: "Captura" },
  { href: "/pt/tarefas", label: "Tarefas" },
  { href: "/pt/calendario", label: "Calendário" },
  { href: "/pt/relatorios", label: "Relatórios" },
  { href: "/pt/definicoes", label: "Definições" },
];

const MOBILE = [
  { href: "/pt/hoje", label: "Hoje" },
  { href: "/pt/tarefas", label: "Tarefas" },
  { href: "/pt/captura", label: "Falar", speak: true },
  { href: "/pt/calendario", label: "Agenda" },
  { href: "/pt/relatorios", label: "Resumo" },
];

export function AppShell({
  children,
  userName,
}: {
  children: React.ReactNode;
  userName: string;
}) {
  const pathname = usePathname();
  const first = userName.split(" ")[0] || userName;

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <BrandLogo href="/pt/hoje" size="sm" />
        <p className="muted small">A tua vida, organizada.</p>
        <nav className="sidebar-nav" aria-label="Principal">
          {NAV.map((item) => {
            const active = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn("nav-link", active && "active")}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-foot">
          <p className="muted small">Olá, {first}</p>
          <SignOutButton />
        </div>
      </aside>

      <div className="app-main">
        <header className="app-topbar">
          <div className="topbar-brand-mobile">
            <BrandLogo href="/pt/hoje" size="sm" />
          </div>
          <div className="topbar-actions">
            <Link href="/pt/captura" className="btn btn-primary btn-sm">
              Falar
            </Link>
          </div>
        </header>
        {children}
      </div>

      <nav className="mobile-tabbar" aria-label="Navegação móvel">
        {MOBILE.map((item) => {
          const active = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn("tab-link", active && "active", item.speak && "speak")}
            >
              <span aria-hidden style={{ fontSize: "0.85rem" }}>
                {item.speak ? "●" : "○"}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
