import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  DEFAULT_ZRIK_VARIANT,
  ZrikWordmark,
  type ZrikLogoVariant,
} from "@/components/layout/BrandLogo";
import { BRAND_INK } from "@/config/brand";

type Props = { params: Promise<{ locale: string }> };

const VARIANTS: {
  id: ZrikLogoVariant;
  titleKey: "optionA" | "optionB" | "optionC";
  descKey: "optionADesc" | "optionBDesc" | "optionCDesc";
}[] = [
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
            {t("note")}{" "}
            <Link href="/homepage-lab" style={{ color: "var(--accent)", fontWeight: 600 }}>
              Homepage Lab →
            </Link>
          </p>
        </header>

        <div className="branding-block" style={{ marginTop: 0 }}>
          <h2 className="branding-block-title">{t("logoTitle")}</h2>
          <p className="muted branding-block-lead">{t("logoLead")}</p>
          <div className="branding-grid">
            {VARIANTS.map((v) => {
              const isDefault = v.id === DEFAULT_ZRIK_VARIANT;
              return (
                <article
                  key={v.id}
                  className={isDefault ? "branding-card is-default" : "branding-card"}
                >
                  <h3 className="branding-card-title">
                    {t(v.titleKey)}
                    {isDefault ? (
                      <span className="branding-default-badge">{t("defaultBadge")}</span>
                    ) : null}
                  </h3>
                  <p className="muted branding-card-desc">{t(v.descKey)}</p>

                  <div className="branding-swatch branding-swatch-light">
                    <span className="branding-swatch-label">{t("onLight")}</span>
                    <ZrikWordmark variant={v.id} className="branding-logo-lg" />
                  </div>

                  <div className="branding-swatch branding-swatch-dark">
                    <span className="branding-swatch-label">{t("onDark")}</span>
                    <ZrikWordmark
                      variant={v.id}
                      tone="on-dark"
                      className="branding-logo-lg branding-logo-on-dark"
                    />
                  </div>
                </article>
              );
            })}
          </div>
          <p className="muted" style={{ marginTop: "1.25rem", fontSize: "0.88rem" }}>
            Ink reference: {BRAND_INK}
          </p>
        </div>
      </div>
    </section>
  );
}
