import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { auth } from "@/lib/auth";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { ZrikWordmark } from "@/components/layout/BrandLogo";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const session = await auth();
  const role = session?.user?.role;

  const primary =
    role === "CUSTOMER"
      ? { href: "/pedidos/novo" as const, label: t("ctaRequest") }
      : role === "DRIVER"
        ? { href: "/painel" as const, label: t("ctaDashboard") }
        : role === "ADMIN"
          ? { href: "/admin" as const, label: t("ctaAdmin") }
          : { href: "/registo?role=CUSTOMER" as const, label: t("ctaRequest") };

  const secondary =
    role === "CUSTOMER"
      ? { href: "/pedidos" as const, label: t("ctaMyTrips") }
      : role === "DRIVER"
        ? { href: "/pedidos-abertos" as const, label: t("ctaDriver") }
        : role === "ADMIN"
          ? { href: "/admin/verificacoes" as const, label: t("ctaAdmin") }
          : { href: "/como-funciona" as const, label: t("ctaHow") };

  return (
    <>
      {/*
        Production hero stays unlocked: clean editorial shell only.
        Photo + color winners are chosen in /homepage-lab — not applied here yet.
        No phone mockups. No abstract blur backdrop behind copy.
      */}
      <section className="hero hero-editorial hero-editorial-pending">
        <div className="container hero-editorial-split">
          <div className="hero-editorial-copy">
            <p className="hero-eyebrow fade-up">{t("eyebrow")}</p>
            <h1 className="hero-brand fade-up">
              <ZrikWordmark as="span" variant="B" />
            </h1>
            <p className="hero-copy fade-up-delay">
              <span className="hero-copy-line">{t("copyLine1")}</span>
              <span className="hero-copy-line">{t("copyLine2")}</span>
            </p>
            <div className="cta-row fade-up-delay">
              <Link href={primary.href} className="btn btn-primary btn-hero">
                {primary.label}
              </Link>
              <Link href={secondary.href} className="btn btn-secondary btn-hero-ghost">
                {secondary.label}
              </Link>
            </div>
            {!role ? (
              <p className="hero-lab-hint fade-up-delay">
                <Link href="/homepage-lab">{t("labHint")}</Link>
              </p>
            ) : null}
          </div>
          <div className="hero-editorial-photo-slot" aria-hidden>
            <div className="hero-editorial-photo-placeholder">
              <span>{t("labPhotoPending")}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section section-premium">
        <div className="container">
          <div className="section-premium-head">
            <h2>{t("stepsTitle")}</h2>
            <p className="lead">{t("stepsLead")}</p>
          </div>
          <div className="steps steps-premium">
            <div>
              <div className="step-num">01</div>
              <h3>{t("step1Title")}</h3>
              <p className="muted">{t("step1Body")}</p>
            </div>
            <div>
              <div className="step-num">02</div>
              <h3>{t("step2Title")}</h3>
              <p className="muted">{t("step2Body")}</p>
            </div>
            <div>
              <div className="step-num">03</div>
              <h3>{t("step3Title")}</h3>
              <p className="muted">{t("step3Body")}</p>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter termsLabel={t("terms")} privacyLabel={t("privacy")} />
    </>
  );
}
