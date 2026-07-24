import { getTranslations, setRequestLocale } from "next-intl/server";
import { ZrikWordmark, type ZrikLogoVariant } from "@/components/layout/BrandLogo";

type Props = { params: Promise<{ locale: string }> };

const VARIANTS: { id: ZrikLogoVariant; titleKey: "optionA" | "optionB" | "optionC"; descKey: "optionADesc" | "optionBDesc" | "optionCDesc" }[] = [
  { id: "A", titleKey: "optionA", descKey: "optionADesc" },
  { id: "B", titleKey: "optionB", descKey: "optionBDesc" },
  { id: "C", titleKey: "optionC", descKey: "optionCDesc" },
];

export default async function BrandingPreviewPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("branding");

  return (
    <section className="section branding-preview fade-up">
      <div className="container" style={{ maxWidth: 1080 }}>
        <header className="branding-preview-intro">
          <h1 className="page-title">{t("title")}</h1>
          <p className="page-lead">{t("lead")}</p>
          <p className="muted" style={{ marginTop: "-0.75rem" }}>
            {t("note")}
          </p>
        </header>

        <div className="branding-grid">
          {VARIANTS.map((v) => (
            <article key={v.id} className="branding-card">
              <h2 className="branding-card-title">{t(v.titleKey)}</h2>
              <p className="muted branding-card-desc">{t(v.descKey)}</p>

              <div className="branding-swatch branding-swatch-light">
                <span className="branding-swatch-label">{t("onLight")}</span>
                <ZrikWordmark variant={v.id} className="branding-logo-lg" />
              </div>

              <div className="branding-swatch branding-swatch-dark">
                <span className="branding-swatch-label">{t("onDark")}</span>
                <ZrikWordmark variant={v.id} className="branding-logo-lg branding-logo-on-dark" />
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
