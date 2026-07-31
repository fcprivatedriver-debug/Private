import { setRequestLocale, getTranslations } from "next-intl/server";
import { getSiteSettings } from "@/lib/session";

type Props = { params: Promise<{ locale: string }> };

export default async function PrivacidadePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("legal");
  const settings = await getSiteSettings();
  const isPt = locale.startsWith("pt");
  const html = isPt ? settings.privacyHtmlPt : settings.privacyHtmlEn;

  return (
    <section className="section fade-up">
      <div className="container" style={{ maxWidth: 720 }}>
        <h1 className="page-title">{t("privacyTitle")}</h1>
        {html ? (
          <div className="prose-block" dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <p className="page-lead">{t("preliminary")}</p>
        )}
      </div>
    </section>
  );
}
