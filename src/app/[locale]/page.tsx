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
          : { href: "/para-motoristas" as const, label: t("ctaDriver") };

  return (
    <>
      <section className="hero hero-premium">
        <div className="hero-premium-grid" aria-hidden />
        <div className="container hero-content">
          <p className="hero-eyebrow fade-up">{t("eyebrow")}</p>
          <h1 className="hero-brand fade-up">
            <ZrikWordmark as="span" variant="B" tone="on-dark" />
          </h1>
          <p className="hero-copy fade-up-delay">{t("copy")}</p>
          <div className="cta-row fade-up-delay">
            <Link href={primary.href} className="btn btn-primary btn-hero">
              {primary.label}
            </Link>
            <Link href={secondary.href} className="btn btn-secondary btn-hero-ghost">
              {secondary.label}
            </Link>
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
