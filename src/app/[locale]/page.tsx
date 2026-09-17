import Link from "next/link";
import { BrandLogo } from "@/components/layout/BrandLogo";
import {
  APP_NAME,
  ASSISTANT_NAME,
  APP_HERO_SUPPORT,
  ASSISTANT_LINE,
} from "@/config/brand";

/** Valores apenas demonstrativos na landing — nunca dados reais do utilizador. */
const DEMO_CARDS = [
  { title: "Saldo", value: "1.240,00 €", hint: "Disponível este mês" },
  { title: "Despesas", value: "386,40 €", hint: "Deste mês" },
  { title: "Poupança", value: "210,00 €", hint: "Para objetivos" },
] as const;

export default function LandingPage() {
  return (
    <div className="landing landing-v2">
      <nav className="landing-nav" aria-label="Principal">
        <BrandLogo href="/pt" size="md" />
        <div className="landing-nav-actions">
          <Link href="/pt/login" className="btn btn-ghost btn-sm">
            Entrar
          </Link>
          <Link href="/pt/registo" className="btn btn-primary btn-sm">
            Começar
          </Link>
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
          <Link href="/pt/registo" className="btn btn-primary">
            Começar
          </Link>
          <Link href="/pt/login" className="btn btn-ghost">
            Já tenho conta
          </Link>
        </div>
      </section>

      <section className="landing-glance" aria-label="Resumo demonstrativo">
        <div className="landing-glance-grid">
          {DEMO_CARDS.map((card) => (
            <article key={card.title} className="landing-glance-card">
              <p className="landing-glance-label">{card.title}</p>
              <p className="landing-glance-value">{card.value}</p>
              <p className="landing-glance-hint">{card.hint}</p>
            </article>
          ))}
        </div>
        <p className="landing-demo-note muted small">
          Exemplos ilustrativos — não são dados da tua conta.
        </p>
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
          <Link href="/pt/termos">Termos</Link>
          <Link href="/pt/privacidade">Privacidade</Link>
          <Link href="/pt/login">Entrar</Link>
        </div>
      </footer>
    </div>
  );
}
