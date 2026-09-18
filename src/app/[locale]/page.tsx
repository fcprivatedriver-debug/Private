import { BrandLogo } from "@/components/layout/BrandLogo";
import { HardNavLink } from "@/components/auth/HardNavLink";
import {
  APP_NAME,
  ASSISTANT_NAME,
  APP_HERO_SUPPORT,
  ASSISTANT_LINE,
} from "@/config/brand";

/**
 * Landing pública — sem saldos/despesas inventados.
 * O layout locale (`layout.tsx`) renderiza `{children}` para /pt/login funcionar.
 * Entrar usa HardNavLink (navegação completa) para nunca ficar preso na shell da landing.
 */
export default function LandingPage() {
  return (
    <div className="landing landing-v2">
      <nav className="landing-nav" aria-label="Principal">
        <BrandLogo href="/pt" size="md" />
        <div className="landing-nav-actions">
          <HardNavLink href="/pt/login" className="btn btn-ghost btn-sm">
            Entrar
          </HardNavLink>
          <HardNavLink href="/pt/registo" className="btn btn-primary btn-sm">
            Começar
          </HardNavLink>
        </div>
      </nav>

      <section className="landing-hero" aria-labelledby="landing-hero-title">
        <h1 id="landing-hero-title" className="landing-hero-title">
          Sabe onde vai
          <br />
          o teu dinheiro.
          <br />
          Agora.
        </h1>
        <p className="landing-hero-lead">{APP_HERO_SUPPORT}</p>
        <p className="landing-hero-mel">{ASSISTANT_LINE}</p>
        <div className="landing-hero-cta">
          <HardNavLink href="/pt/registo" className="btn btn-primary">
            Começar
          </HardNavLink>
          <HardNavLink href="/pt/login" className="btn btn-ghost">
            Já tenho conta
          </HardNavLink>
        </div>
      </section>

      <section className="landing-mel" aria-labelledby="landing-mel-title">
        <p className="landing-mel-kicker">{ASSISTANT_NAME}</p>
        <h2 id="landing-mel-title" className="landing-mel-title">
          Pergunta. Percebe. Decide.
        </h2>
        <p className="landing-mel-copy">
          Diz quanto gastaste, pergunta onde podes poupar, compara compras.
          A {ASSISTANT_NAME} responde em linguagem simples — tu decides.
        </p>
      </section>

      <footer className="landing-footer">
        <p className="muted small" style={{ margin: 0 }}>
          {APP_NAME} · {ASSISTANT_NAME}
        </p>
        <div className="landing-footer-links">
          <HardNavLink href="/pt/termos">Termos</HardNavLink>
          <HardNavLink href="/pt/privacidade">Privacidade</HardNavLink>
          <HardNavLink href="/pt/login">Entrar</HardNavLink>
        </div>
      </footer>
    </div>
  );
}
