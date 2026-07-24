import { getLocale, getTranslations } from "next-intl/server";
import { Link as LocaleLink } from "@/i18n/navigation";
import { auth, signOut } from "@/lib/auth";
import { routing } from "@/i18n/routing";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { dashboardPathForRole } from "@/lib/auth-routes";

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

export async function SiteHeader() {
  const session = await auth();
  const role = session?.user?.role;
  const locale = await getLocale();
  const t = await getTranslations("nav");
  const homeHref = session?.user ? dashboardPathForRole(role) : "/login";

  return (
    <header className="site-header">
      <div className="container site-header-inner">
        <BrandLogo href={homeHref} />
        <nav className="nav-links">
          {role === "CUSTOMER" && (
            <>
              <LocaleLink href="/pedidos">{t("myTrips")}</LocaleLink>
              <LocaleLink href="/pedidos/novo">{t("newTrip")}</LocaleLink>
            </>
          )}
          {role === "DRIVER" && (
            <>
              <LocaleLink href="/painel">{t("dashboard")}</LocaleLink>
              <LocaleLink href="/pedidos-abertos">{t("openRequests")}</LocaleLink>
              <LocaleLink href="/propostas">{t("myOffers")}</LocaleLink>
              <LocaleLink href="/viagens">{t("trips")}</LocaleLink>
              <LocaleLink href="/veiculo">{t("vehicle")}</LocaleLink>
            </>
          )}
          {role === "ADMIN" && (
            <>
              <LocaleLink href="/admin">{t("admin")}</LocaleLink>
              <LocaleLink href="/admin/verificacoes">{t("verifications")}</LocaleLink>
              <LocaleLink href="/admin/vehicle-classes">{t("vehicleClasses")}</LocaleLink>
            </>
          )}
          <LocaleSwitcher locale={locale} />
          {!session ? (
            <>
              <LocaleLink href="/login">{t("login")}</LocaleLink>
              <LocaleLink href="/registo" className="btn btn-primary btn-sm">
                {t("start")}
              </LocaleLink>
            </>
          ) : (
            <>
              <span className="muted" style={{ fontSize: "0.88rem" }}>
                {session.user.name?.split(" ")[0]}
              </span>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: `/${locale}/login` });
                }}
              >
                <button type="submit" className="btn btn-secondary btn-sm">
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
