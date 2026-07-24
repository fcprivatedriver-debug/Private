import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";

type Props = { params: Promise<{ locale: string }> };

export default async function ParaMotoristasPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("forDrivers");

  return (
    <section className="section fade-up">
      <div className="container" style={{ maxWidth: 720 }}>
        <h1 className="page-title" style={{ fontSize: "clamp(2.4rem, 6vw, 3.6rem)" }}>
          {t("title")}
        </h1>
        <p className="page-lead">{t("lead")}</p>
        <div className="ink-band fade-up-delay">
          <p style={{ margin: "0 0 0.35rem", fontWeight: 600, letterSpacing: "-0.02em" }}>ZRIK Drivers</p>
          <p className="muted" style={{ margin: 0, maxWidth: "28rem" }}>
            Verified profiles. Transparent offers. A platform built for professionals.
          </p>
        </div>
        <div className="cta-row" style={{ marginTop: "0.5rem" }}>
          <Link href="/registo?role=DRIVER" className="btn btn-primary">
            {t("ctaRegister")}
          </Link>
          <Link href="/login" className="btn btn-secondary">
            {t("ctaLogin")}
          </Link>
        </div>
      </div>
    </section>
  );
}
