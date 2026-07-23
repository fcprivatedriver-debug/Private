import { Link } from "@/i18n/navigation";
import { BrandLogo } from "@/components/layout/BrandLogo";

export function SiteFooter({
  termsLabel,
  privacyLabel,
}: {
  termsLabel: string;
  privacyLabel: string;
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
        </div>
      </div>
    </footer>
  );
}
