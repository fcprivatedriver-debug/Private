"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { HeaderIdentity } from "@/components/layout/HeaderIdentity";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { useTheme } from "@/components/providers/ThemeProvider";
import { SpaceSwitcher } from "@/components/nina/SpaceSwitcher";
import { QuickAddFab } from "@/components/layout/QuickAddFab";
import type { NinaSpace } from "@/actions/household";
import { cn } from "@/lib/utils";

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

function TopbarIconSearch() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M16.5 16.5 21 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function TopbarIconBell() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden>
      <path
        d="M6 16.5V11a6 6 0 1 1 12 0v5.5l1.2 1.8H4.8L6 16.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M10 19.2a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function TopbarIconProfile() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="10" r="3.2" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M6.8 18.2c1.4-2.2 3.2-3.3 5.2-3.3s3.8 1.1 5.2 3.3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function AppShell({
  children,
  userName,
  familyName,
  userImage,
  familyImage,
  unreadAlerts = 0,
  space = "personal",
}: {
  children: React.ReactNode;
  userName: string;
  familyName?: string;
  userImage?: string | null;
  familyImage?: string | null;
  unreadAlerts?: number;
  space?: NinaSpace;
}) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [activeSpace, setActiveSpace] = useState<NinaSpace>(space);

  useEffect(() => {
    setActiveSpace(space);
  }, [space]);

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="sidebar-top">
          <BrandLogo href="/pt/dashboard" size="sm" />
        </div>
        <div className="sidebar-space">
          <SpaceSwitcher space={activeSpace} onSpaceChange={setActiveSpace} />
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
        <div className="app-chrome-sticky">
          {/* Cabeçalho de marca — logótipo Add and Know (mockup) */}
          <header className="app-topbar app-topbar--brand" data-testid="app-brand-header">
            <BrandLogo href="/pt/dashboard" size="sm" />
            <nav className="topbar-utility" aria-label="Atalhos">
              <Link href="/pt/pesquisa" className="topbar-utility-btn" aria-label="Pesquisar" prefetch>
                <TopbarIconSearch />
              </Link>
              <Link href="/pt/alertas" className="topbar-utility-btn" aria-label="Avisos" prefetch>
                <TopbarIconBell />
                {unreadAlerts > 0 ? <span className="topbar-utility-dot" aria-hidden /> : null}
              </Link>
              <Link href="/pt/perfil" className="topbar-utility-btn" aria-label="Perfil" prefetch>
                <TopbarIconProfile />
              </Link>
            </nav>
          </header>
          {/* Identidade Pessoal/Familiar — sob o logótipo (mockup) */}
          <div className="app-space-bar" data-testid="app-space-header">
            <HeaderIdentity
              space={activeSpace}
              userName={userName}
              familyName={familyName}
              userImage={userImage}
              familyImage={familyImage}
            />
            <div className="topbar-space">
              <SpaceSwitcher space={activeSpace} onSpaceChange={setActiveSpace} />
            </div>
          </div>
        </div>
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
