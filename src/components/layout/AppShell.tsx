"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { useTheme } from "@/components/providers/ThemeProvider";
import { SpaceSwitcher } from "@/components/nina/SpaceSwitcher";
import { QuickAddFab } from "@/components/layout/QuickAddFab";
import type { NinaSpace } from "@/actions/household";
import { cn } from "@/lib/utils";
import { NINA_MISSION_SHORT } from "@/lib/ai/mission";

/** Sidebar completa — secundário fica em Mais no mobile. */
const NAV = [
  { href: "/pt/dashboard", label: "Hoje" },
  { href: "/pt/guia", label: "Guia" },
  { href: "/pt/captura?mode=voice&auto=1", label: "Falar", match: "/pt/captura" },
  { href: "/pt/lista", label: "Compras" },
  { href: "/pt/transacoes", label: "Transações" },
  { href: "/pt/despesas", label: "Despesas" },
  { href: "/pt/receitas", label: "Receitas" },
  { href: "/pt/familia", label: "Família" },
  { href: "/pt/orcamentos", label: "Orçamentos" },
  { href: "/pt/objetivos", label: "Objetivos" },
  { href: "/pt/poupancas", label: "Poupança" },
  { href: "/pt/estatisticas", label: "Resumo" },
  { href: "/pt/mobilidade", label: "Mobilidade" },
  { href: "/pt/calendario", label: "Calendário" },
  { href: "/pt/ligacoes", label: "Ligações" },
  { href: "/pt/personalizar", label: "Personalizar MEL" },
  { href: "/pt/perfil", label: "Perfil" },
  { href: "/pt/definicoes", label: "Mais" },
];

const MOBILE = [
  { href: "/pt/dashboard", label: "Hoje", icon: "⌂" },
  { href: "/pt/guia", label: "Guia", icon: "◎" },
  { href: "/pt/captura?mode=voice&auto=1", label: "Falar", match: "/pt/captura", icon: "◉" },
  { href: "/pt/lista", label: "Compras", icon: "☰" },
  { href: "/pt/definicoes", label: "Mais", icon: "⋯" },
];

export function AppShell({
  children,
  userName,
  familyName,
  unreadAlerts = 0,
  space = "personal",
}: {
  children: React.ReactNode;
  userName: string;
  familyName?: string;
  unreadAlerts?: number;
  space?: NinaSpace;
}) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="sidebar-top">
          <BrandLogo href="/pt/dashboard" size="sm" />
          <p className="sidebar-tag">{NINA_MISSION_SHORT}</p>
          {familyName ? <p className="sidebar-family">{familyName}</p> : null}
        </div>
        <div className="sidebar-space">
          <SpaceSwitcher space={space} />
        </div>
        <nav className="sidebar-nav" aria-label="Principal">
          {NAV.map((item) => {
            const match = "match" in item && item.match ? item.match : item.href;
            const active = pathname?.startsWith(match);
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch
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
            {(["light", "dark", "blue", "system"] as const).map((t) => (
              <button
                key={t}
                type="button"
                className={cn("theme-btn", theme === t && "active")}
                onClick={() => setTheme(t)}
              >
                {t === "light" ? "Claro" : t === "dark" ? "Escuro" : t === "blue" ? "Azul" : "Auto"}
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
            {familyName ? <span className="topbar-family">{familyName}</span> : null}
          </div>
          <div className="topbar-space-mobile">
            <SpaceSwitcher space={space} />
          </div>
          <div className="topbar-actions topbar-actions-desktop">
            <Link href="/pt/captura?mode=voice&auto=1" className="btn btn-primary btn-sm" prefetch>
              Falar
            </Link>
            <Link href="/pt/despesas/nova" className="btn btn-ghost btn-sm" prefetch>
              Despesa
            </Link>
          </div>
        </header>
        <main className="app-content">{children}</main>
      </div>
      <QuickAddFab />
      <nav className="mobile-nav" aria-label="Mobile">
        {MOBILE.map((item) => {
          const match = "match" in item && item.match ? item.match : item.href;
          const active = pathname?.startsWith(match);
          const isCaptura = match.includes("captura");
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              className={cn("mobile-nav-link", isCaptura && "is-captura", active && "active")}
            >
              <span className="mobile-nav-icon" aria-hidden>
                {item.icon}
              </span>
              <span className="mobile-nav-label">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
