import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Link as LocaleLink } from "@/i18n/navigation";
import { auth, signOut } from "@/lib/auth";
import { routing } from "@/i18n/routing";

function LocaleSwitcher({ locale }: { locale: string }) {
  return (
    <div className="locale-switch">
      {routing.locales.map((l) => (
        <Link
          key={l}
          href={`/${l}`}
          hrefLang={l}
          aria-current={l === locale ? "true" : undefined}
        >
          {l}
        </Link>
      ))}
    </div>
  );
}

export async function SiteHeader() {
  const session = await auth();
  const role = session?.user?.role;
  const locale = await getLocale();
  const t = await getTranslations("nav");

  return (
    <header className="site-header">
      <div className="container site-header-inner">
        <LocaleLink href="/" className="logo">
          Mov<span>io</span>
        </LocaleLink>
        <nav className="nav-links">
          <LocaleLink href="/como-funciona">{t("howItWorks")}</LocaleLink>
          <LocaleLink href="/para-motoristas">{t("drivers")}</LocaleLink>
          {role === "CUSTOMER" && <LocaleLink href="/pedidos">{t("myTrips")}</LocaleLink>}
          {role === "DRIVER" && (
            <>
              <LocaleLink href="/painel">{t("dashboard")}</LocaleLink>
              <LocaleLink href="/onboarding">Onboarding</LocaleLink>
              <LocaleLink href="/viagens">{t("trips")}</LocaleLink>
            </>
          )}
          {role === "ADMIN" && <LocaleLink href="/admin">{t("admin")}</LocaleLink>}
          <LocaleSwitcher locale={locale} />
          {!session ? (
            <>
              <LocaleLink href="/login">{t("login")}</LocaleLink>
              <LocaleLink href="/registo" className="btn btn-primary" style={{ padding: "0.55rem 1rem" }}>
                {t("start")}
              </LocaleLink>
            </>
          ) : (
            <>
              <span className="muted" style={{ fontSize: "0.9rem" }}>
                {session.user.name}
              </span>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: `/${locale}` });
                }}
              >
                <button
                  type="submit"
                  className="btn btn-secondary"
                  style={{ padding: "0.55rem 1rem" }}
                >
                  {t("logout")}
                </button>
              </form>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
