import Link from "next/link";
import { BrandLogo } from "./brand-logo";
import { Container } from "@/components/ui/container";
import { marketingNav } from "@/config/navigation";
import { siteConfig } from "@/config/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--border)] bg-[var(--ink)] text-[var(--ink-foreground)]">
      <Container className="grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="space-y-4">
          <BrandLogo tone="light" />
          <p className="max-w-sm text-sm leading-relaxed text-white/65">
            {siteConfig.description}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/45">
            Navegação
          </p>
          <ul className="mt-4 space-y-2">
            {marketingNav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-sm text-white/75 transition-colors hover:text-white"
                >
                  {item.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/45">
            Conta
          </p>
          <ul className="mt-4 space-y-2 text-sm text-white/75">
            <li>
              <Link href="/login" className="hover:text-white">
                Entrar
              </Link>
            </li>
            <li>
              <Link href="/registo" className="hover:text-white">
                Registo
              </Link>
            </li>
            <li>
              <a href={`mailto:${siteConfig.supportEmail}`} className="hover:text-white">
                {siteConfig.supportEmail}
              </a>
            </li>
          </ul>
        </div>
      </Container>
      <Container className="border-t border-white/10 py-6 text-xs text-white/45">
        © {new Date().getFullYear()} {siteConfig.name}. Todos os direitos reservados.
      </Container>
    </footer>
  );
}
