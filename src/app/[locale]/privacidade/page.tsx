import { getTranslations, setRequestLocale } from "next-intl/server";

type Props = { params: Promise<{ locale: string }> };

export default async function PrivacidadePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("legal");

  return (
    <section className="section fade-up">
      <div className="container" style={{ maxWidth: 720 }}>
        <h1 className="font-display" style={{ fontSize: "2.4rem" }}>
          {t("privacyTitle")}
        </h1>
        <p className="muted">{t("preliminary")}</p>
        <div className="panel" style={{ marginTop: "1.5rem", lineHeight: 1.6 }}>
          <p>
            We process account data (name, email, phone), trip requests and offers to operate the
            Movio marketplace.
          </p>
          <p>
            Customer and driver contact details become visible to the counterpart only after payment
            has been successfully confirmed — never at offer acceptance alone.
          </p>
          <p>
            You may request access or deletion of your data by contacting the Movio team. This page
            will be finalized before production launch.
          </p>
        </div>
      </div>
    </section>
  );
}
