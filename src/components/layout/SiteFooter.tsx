import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { BRAND } from "@/config/brand";

export async function SiteFooter() {
  const t = await getTranslations("footer");

  return (
    <footer className="site-footer">
      <div className="container site-footer-inner">
        <div className="site-footer-grid">
          <div>
            <BrandLogo tone="on-dark" size="sm" />
            <p className="muted" style={{ marginTop: "0.75rem", color: "rgba(255,255,255,0.65)", maxWidth: "28ch" }}>
              {t("tagline")}
            </p>
          </div>
          <div>
            <p style={{ fontWeight: 600, marginBottom: "0.5rem" }}>{t("contactTitle")}</p>
            <p style={{ margin: 0, opacity: 0.85, lineHeight: 1.7 }}>
              <a href={`mailto:${BRAND.email}`}>{BRAND.email}</a>
              <br />
              <a href={`tel:${BRAND.phoneE164}`}>{BRAND.phoneDisplay}</a>
              <br />
              <a href={BRAND.whatsappUrl} target="_blank" rel="noopener noreferrer">
                WhatsApp
              </a>
            </p>
          </div>
          <div>
            <p style={{ fontWeight: 600, marginBottom: "0.5rem" }}>{t("legalTitle")}</p>
            <div className="site-footer-links">
              <Link href="/termos">{t("terms")}</Link>
              <span aria-hidden className="site-footer-sep">
                ·
              </span>
              <Link href="/privacidade">{t("privacy")}</Link>
            </div>
          </div>
        </div>
        <p style={{ fontSize: "0.8rem", opacity: 0.55, margin: 0 }}>
          © {new Date().getFullYear()} {BRAND.name}. {t("rights")}
        </p>
      </div>
    </footer>
  );
}
