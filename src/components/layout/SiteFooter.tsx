import { BrandLogo } from "@/components/layout/BrandLogo";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container" style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
        <BrandLogo size="sm" />
        <p className="muted small" style={{ margin: 0 }}>
          Mel · Assistente pessoal · Portugal
        </p>
      </div>
    </footer>
  );
}
