"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { useTheme } from "@/components/providers/ThemeProvider";
import { SpaceSwitcher } from "@/components/nina/SpaceSwitcher";
import type { NinaSpace } from "@/actions/household";
import { cn } from "@/lib/utils";

/** Navegação simples — captura e conversa no centro. */
const NAV = [
  { href: "/pt/captura", label: "Captura" },
  { href: "/pt/dashboard", label: "Conversar" },
  { href: "/pt/despesas", label: "Gastos" },
  { href: "/pt/lista", label: "Compras" },
  { href: "/pt/receitas", label: "Entradas" },
  { href: "/pt/poupancas", label: "Poupanças" },
  { href: "/pt/objetivos", label: "Objetivos" },
  { href: "/pt/orcamentos", label: "Limites" },
  { href: "/pt/estatisticas", label: "Resumo" },
  { href: "/pt/familia", label: "Conta" },
  { href: "/pt/ligacoes", label: "Ligações" },
  { href: "/pt/memoria", label: "Memória" },
  { href: "/pt/perfil", label: "Perfil" },
  { href: "/pt/alertas", label: "Avisos" },
  { href: "/pt/definicoes", label: "Mais" },
];

const MOBILE = [
  { href: "/pt/dashboard", label: "Nina" },
  { href: "/pt/lista", label: "Compras" },
  { href: "/pt/captura?mode=voice&auto=1", label: "Falar", match: "/pt/captura" },
  { href: "/pt/objetivos", label: "Objetivos" },
  { href: "/pt/definicoes", label: "Mais" },
];

export function AppShell({
  children,
  userName,
  unreadAlerts = 0,
  space = "personal",
}: {
  children: React.ReactNode;
  userName: string;
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
          <p className="sidebar-tag">Quanto mais usas, menos trabalho tens</p>
        </div>
        <div className="sidebar-space">
          <SpaceSwitcher space={space} />
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
          <div className="topbar-space-mobile">
            <SpaceSwitcher space={space} />
          </div>
          <div className="topbar-actions">
            <Link href="/pt/captura?mode=voice&auto=1" className="btn btn-primary btn-sm">
              Falar
            </Link>
            <Link href="/pt/captura?mode=photo&auto=1" className="btn btn-ghost btn-sm">
              Fatura
            </Link>
          </div>
        </header>
        <main className="app-content">{children}</main>
      </div>
      <Link
        href="/pt/captura?mode=voice&auto=1"
        className="captura-fab"
        aria-label="Falar com a Nina — captura por voz"
      >
        +
      </Link>
      <nav className="mobile-nav" aria-label="Mobile">
        {MOBILE.map((item) => {
          const match = "match" in item && item.match ? item.match : item.href;
          const active = pathname?.startsWith(match);
          const isCaptura = match.includes("captura");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn("mobile-nav-link", isCaptura && "is-captura", active && "active")}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
