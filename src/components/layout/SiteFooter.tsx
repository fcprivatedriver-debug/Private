import { Link } from "@/i18n/navigation";
import { BrandLogo } from "@/components/layout/BrandLogo";

export function SiteFooter({
  termsLabel,
  privacyLabel,
  driversLabel,
}: {
  termsLabel: string;
  privacyLabel: string;
  driversLabel?: string;
}) {
  return (
    <footer className="site-footer">
      <div className="container site-footer-inner">
        <BrandLogo size="sm" />
        <div className="site-footer-links">
          <Link href="/termos">{termsLabel}</Link>
          <span aria-hidden className="site-footer-sep">
            ·
          </span>
          <Link href="/privacidade">{privacyLabel}</Link>
          {driversLabel ? (
            <>
              <span aria-hidden className="site-footer-sep">
                ·
              </span>
              <Link href="/para-motoristas">{driversLabel}</Link>
            </>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
