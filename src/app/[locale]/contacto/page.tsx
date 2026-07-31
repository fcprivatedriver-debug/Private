import { setRequestLocale, getTranslations } from "next-intl/server";
import { getSiteSettings } from "@/lib/session";
import { BRAND } from "@/config/brand";
import { ContactForm } from "@/components/landing/ContactForm";

type Props = { params: Promise<{ locale: string }> };

export default async function ContactoPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("contact");
  const settings = await getSiteSettings();

  return (
    <section className="section fade-up">
      <div className="container">
        <div className="section-head">
          <h1 className="page-title">{t("title")}</h1>
          <p className="page-lead">{t("lead")}</p>
        </div>
        <div className="steps" style={{ alignItems: "start" }}>
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
                {t("whatsapp")}
              </a>
            </p>
          </div>
          <ContactForm />
        </div>
      </div>
    </section>
  );
}
