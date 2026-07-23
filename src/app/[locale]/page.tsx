import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { auth } from "@/lib/auth";
import { SiteFooter } from "@/components/layout/SiteFooter";

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
      <section className="hero">
        <div className="hero-media" aria-hidden />
        <div className="container hero-content">
          <p className="hero-eyebrow">{t("eyebrow")}</p>
          <h1 className="hero-brand">
            Heg<span>os</span>
          </h1>
          <p className="hero-copy">{t("copy")}</p>
          <div className="cta-row">
            <Link href={primary.href} className="btn btn-primary">
              {primary.label}
            </Link>
            <Link href={secondary.href} className="btn btn-secondary">
              {secondary.label}
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2>{t("stepsTitle")}</h2>
          <p className="lead">{t("stepsLead")}</p>
          <div className="steps">
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
