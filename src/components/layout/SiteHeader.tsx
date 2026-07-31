import { getLocale, getTranslations } from "next-intl/server";
import { Link as LocaleLink } from "@/i18n/navigation";
import { signOut } from "@/lib/auth";
import { getSessionSafe } from "@/lib/session-safe";
import { routing } from "@/i18n/routing";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { ModeSwitcher } from "@/components/layout/ModeSwitcher";
import { prisma } from "@/lib/db";
import { resolveActiveMode } from "@/lib/account-mode";

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
  const session = await getSessionSafe();
  const locale = await getLocale();
  const t = await getTranslations("nav");

  let hasCustomer = Boolean(session?.user?.hasCustomer);
  let hasDriver = Boolean(session?.user?.hasDriver);
  let activeMode = session?.user?.activeMode ?? "CUSTOMER";
  const role = session?.user?.role;

  if (session?.user?.id && (session.user.hasCustomer == null || session.user.hasDriver == null)) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          role: true,
          customerProfile: { select: { id: true } },
          driverProfile: { select: { id: true } },
        },
      });
      hasCustomer =
        Boolean(user?.customerProfile) ||
        user?.role === "CUSTOMER" ||
        user?.role === "ADMIN";
      hasDriver = Boolean(user?.driverProfile) || user?.role === "DRIVER";
      activeMode = resolveActiveMode({
        role: user?.role,
        hasCustomer,
        hasDriver,
        preferred: session.user.activeMode,
      });
    } catch {
      /* keep session defaults */
    }
  }

  const showCustomerNav =
    Boolean(session) &&
    role !== "ADMIN" &&
    (activeMode === "CUSTOMER" || (!hasDriver && hasCustomer));
  const showDriverNav =
    Boolean(session) &&
    role !== "ADMIN" &&
    activeMode === "DRIVER" &&
    hasDriver;

  return (
    <header className="site-header">
      <div className="container site-header-inner">
        <BrandLogo />
        <nav className="nav-links">
          {!session && (
            <LocaleLink href="/como-funciona">{t("howItWorks")}</LocaleLink>
          )}
          {showCustomerNav && (
            <>
              <LocaleLink href="/pedidos">{t("myTrips")}</LocaleLink>
              <LocaleLink href="/pedidos/novo">{t("newTrip")}</LocaleLink>
            </>
          )}
          {showDriverNav && (
            <>
              <LocaleLink href="/painel">{t("dashboard")}</LocaleLink>
              <LocaleLink href="/pedidos-abertos">{t("openRequests")}</LocaleLink>
              <LocaleLink href="/propostas">{t("myOffers")}</LocaleLink>
              <LocaleLink href="/viagens">{t("trips")}</LocaleLink>
              <LocaleLink href="/veiculo">{t("vehicle")}</LocaleLink>
              <LocaleLink href="/onboarding">{t("onboarding")}</LocaleLink>
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
              <LocaleLink href="/registo?role=CUSTOMER" className="btn btn-primary btn-sm">
                {t("start")}
              </LocaleLink>
            </>
          ) : (
            <>
              <ModeSwitcher />
              <span className="muted" style={{ fontSize: "0.88rem" }}>
                {session.user.name?.split(" ")[0]}
              </span>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: `/${locale}` });
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
