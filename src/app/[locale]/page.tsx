import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();
  if (session?.user) redirect(`/${locale}/hoje`);

  const t = await getTranslations("landing");
  const brand = await getTranslations("brand");

  return (
    <div className="mel-atmosphere">
      <SiteHeader />
      <section className="hero container">
        <div className="hero-copy">
          <p className="hero-brand anim-rise">Mel</p>
          <h1 className="hero-headline anim-rise-delay-1">{brand("tagline")}</h1>
          <p className="hero-support anim-rise-delay-2">{brand("support")}</p>
          <div className="hero-cta anim-rise-delay-3">
            <Link href="/registo" className="btn btn-primary">
              {t("cta")}
            </Link>
            <Link href="/login" className="btn btn-ghost">
              {t("ctaSecondary")}
            </Link>
          </div>
        </div>
      </section>

      <section className="container feature-strip">
        <div className="feature-item anim-rise">
          <span className="feature-index">01</span>
          <h3>{t("featureTasks")}</h3>
          <p>{t("featureTasksDesc")}</p>
        </div>
        <div className="feature-item anim-rise-delay-1">
          <span className="feature-index">02</span>
          <h3>{t("featureCalendar")}</h3>
          <p>{t("featureCalendarDesc")}</p>
        </div>
        <div className="feature-item anim-rise-delay-2">
          <span className="feature-index">03</span>
          <h3>{t("featureVoice")}</h3>
          <p>{t("featureVoiceDesc")}</p>
        </div>
        <div className="feature-item anim-rise-delay-3">
          <span className="feature-index">04</span>
          <h3>{t("featureReports")}</h3>
          <p>{t("featureReportsDesc")}</p>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
