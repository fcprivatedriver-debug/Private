import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Plan, SiteSettings } from "@prisma/client";
import { BRAND } from "@/config/brand";
import { formatMoney } from "@/lib/money";
import { ContactForm } from "@/components/landing/ContactForm";

type Props = {
  settings: SiteSettings;
  plans: Plan[];
  locale: string;
};

export async function LandingPage({ settings, plans, locale }: Props) {
  const t = await getTranslations("home");
  const isPt = locale.startsWith("pt");
  const heroTitle = isPt ? settings.heroTitlePt : settings.heroTitleEn;
  const heroSubtitle = isPt ? settings.heroSubtitlePt : settings.heroSubtitleEn;
  const heroImage = settings.heroImageUrl || BRAND.heroImage;

  return (
    <>
      <section className="hero">
        <div className="hero-bg" aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={heroImage} alt="" fetchPriority="high" />
          <div className="hero-overlay" />
        </div>
        <div className="container hero-content fade-up">
          <p className="hero-eyebrow">{t("eyebrow")}</p>
          <h1 className="hero-title">{heroTitle}</h1>
          <p className="hero-subtitle">{heroSubtitle}</p>
          <div className="cta-row fade-up-delay">
            <Link href="/planos" className="btn btn-primary">
              {t("ctaPlans")}
            </Link>
            <Link href="/registo" className="btn btn-ghost">
              {t("ctaRegister")}
            </Link>
            <a href={BRAND.whatsappUrl} className="btn btn-whatsapp" target="_blank" rel="noopener noreferrer">
              {t("ctaWhatsapp")}
            </a>
          </div>
        </div>
      </section>

      <section id="como-funciona" className="section">
        <div className="container">
          <div className="section-head">
            <h2>{t("stepsTitle")}</h2>
            <p className="lead">{t("stepsLead")}</p>
          </div>
          <div className="steps">
            <div className="card-soft">
              <div className="step-num">01</div>
              <h3>{t("step1Title")}</h3>
              <p className="muted">{t("step1Body")}</p>
            </div>
            <div className="card-soft">
              <div className="step-num">02</div>
              <h3>{t("step2Title")}</h3>
              <p className="muted">{t("step2Body")}</p>
            </div>
            <div className="card-soft">
              <div className="step-num">03</div>
              <h3>{t("step3Title")}</h3>
              <p className="muted">{t("step3Body")}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section section-ink">
        <div className="container">
          <div className="section-head">
            <h2>{t("advantagesTitle")}</h2>
            <p className="lead" style={{ color: "rgba(255,255,255,0.72)" }}>
              {t("advantagesLead")}
            </p>
          </div>
          <ul className="advantages" style={{ maxWidth: "42rem" }}>
            <li>{t("advantage1")}</li>
            <li>{t("advantage2")}</li>
            <li>{t("advantage3")}</li>
            <li>{t("advantage4")}</li>
            <li>{t("advantage5")}</li>
            <li>{t("advantage6")}</li>
            <li>{t("advantage7")}</li>
          </ul>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <h2>{t("plansTitle")}</h2>
            <p className="lead">{t("plansLead")}</p>
          </div>
          <div className="steps">
            {plans.map((plan, i) => {
              const features = JSON.parse(plan.featuresJson || "[]") as string[];
              const name = isPt ? plan.namePt : plan.nameEn;
              const description = isPt ? plan.descriptionPt : plan.descriptionEn;
              return (
                <article
                  key={plan.id}
                  className={`card-soft plan-card${i === 1 ? " plan-card-featured" : ""}`}
                >
                  <div>
                    <h3 style={{ margin: "0 0 0.25rem" }}>{name}</h3>
                    {description && <p className="muted" style={{ margin: 0 }}>{description}</p>}
                  </div>
                  <p className="plan-price" style={{ margin: 0 }}>
                    {formatMoney(plan.priceCents, "EUR", locale)}
                    <span style={{ fontSize: "0.9rem", color: "var(--fg-muted)" }}>/mês</span>
                  </p>
                  <ul className="plan-features">
                    {features.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                  <Link href="/planos" className="btn btn-primary">
                    {t("ctaPlans")}
                  </Link>
                </article>
              );
            })}
          </div>
          <p className="muted" style={{ marginTop: "1.5rem", fontSize: "0.88rem" }}>
            {t("plansNote")}
          </p>
        </div>
      </section>

      <section className="section section-tight section-petrol">
        <div className="container">
          <div className="section-head">
            <h2>{t("rulesTitle")}</h2>
          </div>
          <ul className="advantages" style={{ maxWidth: "48rem" }}>
            <li>{t("rule1")}</li>
            <li>{t("rule2")}</li>
            <li>{t("rule3")}</li>
            <li>{t("rule4")}</li>
          </ul>
        </div>
      </section>

      <section id="contactos" className="section">
        <div className="container">
          <div className="steps" style={{ alignItems: "start" }}>
            <div>
              <div className="section-head">
                <h2>{t("contactTitle")}</h2>
                <p className="lead">{t("contactLead")}</p>
              </div>
              <div className="card-soft">
                <p style={{ margin: "0 0 0.5rem" }}>
                  <strong>E-mail:</strong>{" "}
                  <a href={`mailto:${settings.supportEmail}`}>{settings.supportEmail}</a>
                </p>
                <p style={{ margin: "0 0 0.5rem" }}>
                  <strong>Telefone:</strong>{" "}
                  <a href={`tel:${settings.supportPhone.replace(/\s/g, "")}`}>{settings.supportPhone}</a>
                </p>
                <p style={{ margin: 0 }}>
                  <strong>WhatsApp:</strong>{" "}
                  <a href={BRAND.whatsappUrl} target="_blank" rel="noopener noreferrer">
                    {t("ctaWhatsapp")}
                  </a>
                </p>
              </div>
            </div>
            <ContactForm />
          </div>
        </div>
      </section>
    </>
  );
}
