import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  DEFAULT_ZRIK_VARIANT,
  ZrikWordmark,
  type ZrikLogoVariant,
} from "@/components/layout/BrandLogo";
import {
  DEFAULT_PETROL_BLUE,
  PETROL_BLUES,
  BRAND_INK,
} from "@/config/brand";

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
  const isPt = locale.startsWith("pt");

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

        <div className="branding-block">
          <h2 className="branding-block-title">{t("petrolTitle")}</h2>
          <p className="muted branding-block-lead">{t("petrolLead")}</p>
          <div className="petrol-grid">
            {PETROL_BLUES.map((c) => {
              const isDefault = c.id === DEFAULT_PETROL_BLUE.id;
              return (
                <article
                  key={c.id}
                  className={isDefault ? "petrol-card is-default" : "petrol-card"}
                >
                  <div
                    className="petrol-swatch"
                    style={{ background: c.hex }}
                    aria-hidden
                  />
                  <div className="petrol-meta">
                    <h3 className="petrol-name">
                      {isPt ? c.namePt : c.name}
                      {isDefault ? (
                        <span className="branding-default-badge">{t("defaultBadge")}</span>
                      ) : null}
                    </h3>
                    <p className="petrol-hex">{c.hex}</p>
                    <p className="muted petrol-vibe">{c.vibe}</p>
                    <div className="petrol-logo-sample">
                      <span style={{ color: c.hex, fontWeight: 700 }}>Z</span>
                      <span style={{ color: BRAND_INK, fontWeight: 700 }}>RIK</span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <div className="branding-block">
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
        </div>
      </div>
    </section>
  );
}
