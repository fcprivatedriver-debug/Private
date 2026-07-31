import { Link } from "@/i18n/navigation";
import { BRAND } from "@/config/brand";
import { signOut } from "@/lib/auth";
import type { ReactNode } from "react";

type NavItem = { href: string; label: string; icon: string };

const CUSTOMER_NAV: NavItem[] = [
  { href: "/cliente", label: "Início", icon: "⌂" },
  { href: "/cliente/viagem/nova", label: "Viagem", icon: "→" },
  { href: "/minutos", label: "Minutos", icon: "◷" },
  { href: "/perfil", label: "Conta", icon: "◎" },
];

export async function AppShell({
  children,
  userName,
  showCustomerNav = false,
  activePath,
  locale = "pt",
}: {
  children: ReactNode;
  userName?: string;
  showCustomerNav?: boolean;
  activePath?: string;
  locale?: string;
}) {
  return (
    <div className={`app-shell${showCustomerNav ? " has-bottom-nav" : ""}`}>
      <header className="app-topbar">
        <div className="container app-topbar-inner">
          <Link href="/cliente" className="app-topbar-brand">
            {BRAND.shortName} <span>Private Driver</span>
          </Link>
          <div className="app-topbar-actions">
            {userName && (
              <span className="muted" style={{ fontSize: "0.86rem", color: "rgba(255,255,255,0.72)" }}>
                {userName.split(" ")[0]}
              </span>
            )}
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: `/${locale}` });
              }}
            >
              <button type="submit" className="btn btn-secondary btn-sm" style={{ color: "#fff", borderColor: "rgba(255,255,255,0.3)" }}>
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="app-main">
        <div className="container">{children}</div>
      </div>

      {showCustomerNav && (
        <nav className="app-bottom-nav" aria-label="Navegação principal">
          {CUSTOMER_NAV.map((item) => {
            const active =
              activePath === item.href ||
              (item.href !== "/cliente" && activePath?.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href as "/cliente"} className={active ? "active" : ""}>
                <span className="app-bottom-nav-icon" aria-hidden>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
