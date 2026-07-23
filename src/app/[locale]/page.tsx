import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";

type Props = { params: Promise<{ locale: string }> };

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");

  return (
    <>
      <section className="hero">
        <div className="hero-media" aria-hidden />
        <div className="container hero-content">
          <h1 className="hero-brand">
            Mov<span>io</span>
          </h1>
          <p className="hero-copy">{t("copy")}</p>
          <div className="cta-row">
            <Link href="/registo?role=CUSTOMER" className="btn btn-primary">
              {t("ctaRequest")}
            </Link>
            <Link href="/para-motoristas" className="btn btn-secondary">
              {t("ctaDriver")}
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
          <p className="muted" style={{ marginTop: "3rem", fontSize: "0.9rem" }}>
            <Link href="/termos">{t("terms")}</Link>
            {" · "}
            <Link href="/privacidade">{t("privacy")}</Link>
          </p>
        </div>
      </section>
    </>
  );
}
