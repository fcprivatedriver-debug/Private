"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { useTheme } from "@/components/providers/ThemeProvider";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/pt/dashboard", label: "Início" },
  { href: "/pt/receitas", label: "Receitas" },
  { href: "/pt/despesas", label: "Despesas" },
  { href: "/pt/orcamentos", label: "Orçamentos" },
  { href: "/pt/objetivos", label: "Objetivos" },
  { href: "/pt/estatisticas", label: "Estatísticas" },
  { href: "/pt/pesquisa", label: "Pesquisar" },
  { href: "/pt/recorrentes", label: "Recorrentes" },
  { href: "/pt/importacoes", label: "Importar" },
  { href: "/pt/ocr", label: "OCR" },
  { href: "/pt/ia", label: "IA" },
  { href: "/pt/familia", label: "Família" },
  { href: "/pt/alertas", label: "Alertas" },
  { href: "/pt/definicoes", label: "Definições" },
];

export function AppShell({
  children,
  userName,
  unreadAlerts = 0,
}: {
  children: React.ReactNode;
  userName: string;
  unreadAlerts?: number;
}) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="sidebar-top">
          <BrandLogo href="/pt/dashboard" size="sm" />
          <p className="sidebar-tag">Gestão Financeira Familiar</p>
        </div>
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
                {item.href.includes("alertas") && unreadAlerts > 0 ? (
                  <span className="nav-badge">{unreadAlerts}</span>
                ) : null}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-foot">
          <p className="muted small">Olá, {userName.split(" ")[0]}</p>
          <div className="theme-toggle" role="group" aria-label="Tema">
            {(["light", "dark", "system"] as const).map((t) => (
              <button
                key={t}
                type="button"
                className={cn("theme-btn", theme === t && "active")}
                onClick={() => setTheme(t)}
              >
                {t === "light" ? "Claro" : t === "dark" ? "Escuro" : "Auto"}
              </button>
            ))}
          </div>
          <SignOutButton />
        </div>
      </aside>
      <div className="app-main">
        <header className="app-topbar">
          <div className="topbar-brand-mobile">
            <BrandLogo href="/pt/dashboard" size="sm" />
          </div>
          <div className="topbar-actions">
            <Link href="/pt/despesas/nova" className="btn btn-primary btn-sm">
              + Despesa
            </Link>
            <Link href="/pt/receitas/nova" className="btn btn-success btn-sm">
              + Receita
            </Link>
          </div>
        </header>
        <main className="app-content">{children}</main>
      </div>
      <nav className="mobile-nav" aria-label="Mobile">
        {[
          { href: "/pt/dashboard", label: "Início" },
          { href: "/pt/despesas", label: "Despesas" },
          { href: "/pt/receitas", label: "Receitas" },
          { href: "/pt/estatisticas", label: "Stats" },
          { href: "/pt/definicoes", label: "Mais" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn("mobile-nav-link", pathname?.startsWith(item.href) && "active")}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
