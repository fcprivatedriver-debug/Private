import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";

type Props = { params: Promise<{ locale: string }> };

export default async function ParaMotoristasPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("forDrivers");

  return (
    <section className="section fade-up">
      <div className="container">
        <h1 className="font-display" style={{ fontSize: "clamp(2rem,5vw,3rem)" }}>
          {t("title")}
        </h1>
        <p className="lead">{t("lead")}</p>
        <div className="cta-row">
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
