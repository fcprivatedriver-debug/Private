import { getTranslations, setRequestLocale } from "next-intl/server";

type Props = { params: Promise<{ locale: string }> };

export default async function TermosPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("legal");

  return (
    <section className="section fade-up">
      <div className="container" style={{ maxWidth: 720 }}>
        <h1 className="page-title">{t("termsTitle")}</h1>
        <p className="page-lead">{t("preliminary")}</p>
        <div className="prose-block" style={{ marginTop: "0.5rem", lineHeight: 1.7, maxWidth: "40rem" }}>
          <p>
            ZRIK is a marketplace connecting customers with private drivers. The platform is not a
            carrier: it facilitates trip requests, offers and bookings.
          </p>
          <p>
            Users are responsible for the accuracy of published information and for complying with
            applicable passenger transport regulations.
          </p>
          <p>
            Cancellations, refunds and payments will be detailed when Stripe Connect goes live.
            Contact details between parties are revealed only after payment is confirmed.
          </p>
        </div>
      </div>
    </section>
  );
}
