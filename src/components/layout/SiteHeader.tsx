"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useSession, signOut } from "next-auth/react";
import { Link as LocaleLink, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { dashboardPathForRole } from "@/lib/auth-routes";
import { useLocale } from "next-intl";

function LocaleSwitcher({ locale }: { locale: string }) {
  return (
    <div className="locale-switch">
      {routing.locales.map((l) => (
        <LocaleLink
          key={l}
          href="/"
          locale={l}
          hrefLang={l}
          aria-current={l === locale ? "true" : undefined}
        >
          {l}
        </LocaleLink>
      ))}
    </div>
  );
}

export function SiteHeader() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const locale = useLocale();
  const pathname = usePathname();
  const t = useTranslations("nav");
  const [open, setOpen] = useState(false);

  const dashboardHref = role ? dashboardPathForRole(role) : "/login";

  return (
    <header className="site-header">
      <div className="container site-header-inner" style={{ position: "relative" }}>
        <BrandLogo />
        <button
          type="button"
          className="nav-toggle"
          aria-expanded={open}
          aria-controls="site-nav"
          onClick={() => setOpen((v) => !v)}
        >
          Menu
        </button>
        <nav id="site-nav" className={`nav-links${open ? " is-open" : ""}`}>
          <LocaleLink href="/planos" onClick={() => setOpen(false)}>
            {t("plans")}
          </LocaleLink>
          <LocaleLink href="/#como-funciona" onClick={() => setOpen(false)}>
            {t("howItWorks")}
          </LocaleLink>
          <LocaleLink href="/contacto" onClick={() => setOpen(false)}>
            {t("contact")}
          </LocaleLink>

          {role === "CUSTOMER" && (
            <LocaleLink href="/cliente" onClick={() => setOpen(false)}>
              {t("dashboard")}
            </LocaleLink>
          )}
          {role === "ADMIN" && (
            <LocaleLink href="/admin" onClick={() => setOpen(false)}>
              {t("admin")}
            </LocaleLink>
          )}

          <LocaleSwitcher locale={locale} />

          {!session ? (
            <>
              <LocaleLink href="/login" onClick={() => setOpen(false)}>
                {t("login")}
              </LocaleLink>
              <LocaleLink
                href="/registo"
                className="btn btn-primary btn-sm"
                onClick={() => setOpen(false)}
              >
                {t("register")}
              </LocaleLink>
            </>
          ) : (
            <>
              <LocaleLink href={dashboardHref} className="muted" style={{ fontSize: "0.88rem" }}>
                {session.user.name?.split(" ")[0]}
              </LocaleLink>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => signOut({ callbackUrl: `/${locale}` })}
              >
                {t("logout")}
              </button>
            </>
          )}
        </nav>
      </div>

      {session && (
        <nav className="bottom-nav" aria-label="Navegação principal">
          <div className="bottom-nav-inner">
            <LocaleLink href="/" aria-current={pathname === "/" ? "page" : undefined}>
              Início
            </LocaleLink>
            <LocaleLink href="/planos" aria-current={pathname === "/planos" ? "page" : undefined}>
              Planos
            </LocaleLink>
            <LocaleLink
              href={dashboardHref}
              aria-current={pathname.startsWith(dashboardHref) ? "page" : undefined}
            >
              Painel
            </LocaleLink>
            <LocaleLink href="/contacto" aria-current={pathname === "/contacto" ? "page" : undefined}>
              Contacto
            </LocaleLink>
          </div>
        </nav>
      )}
    </header>
  );
}
