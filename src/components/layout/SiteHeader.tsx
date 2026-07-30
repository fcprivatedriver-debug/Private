import { getLocale, getTranslations } from "next-intl/server";
import { Link as LocaleLink } from "@/i18n/navigation";
import { auth, signOut } from "@/lib/auth";
import { routing } from "@/i18n/routing";
import { BrandLogo } from "@/components/layout/BrandLogo";

function LocaleSwitcher({ locale }: { locale: string }) {
  return (
    <div className="header-nav" style={{ gap: "0.35rem" }}>
      {routing.locales.map((l) => (
        <LocaleLink
          key={l}
          href="/"
          locale={l}
          hrefLang={l}
          className="btn btn-ghost btn-sm"
          aria-current={l === locale ? "true" : undefined}
        >
          {l.toUpperCase()}
        </LocaleLink>
      ))}
    </div>
  );
}

export async function SiteHeader() {
  const session = await auth();
  const locale = await getLocale();
  const t = await getTranslations("nav");

  return (
    <header className="site-header">
      <div className="header-inner">
        <BrandLogo href={session ? `/${locale}/hoje` : `/${locale}`} />
        <nav className="header-nav" aria-label="Conta">
          <LocaleSwitcher locale={locale} />
          {!session ? (
            <>
              <LocaleLink href="/login" className="btn btn-ghost btn-sm">
                {t("login")}
              </LocaleLink>
              <LocaleLink href="/registo" className="btn btn-primary btn-sm">
                {t("register")}
              </LocaleLink>
            </>
          ) : (
            <>
              <LocaleLink href="/hoje" className="btn btn-ghost btn-sm">
                {t("today")}
              </LocaleLink>
              <span className="muted small">{session.user.name?.split(" ")[0]}</span>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: `/${locale}` });
                }}
              >
                <button type="submit" className="btn btn-ghost btn-sm">
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
