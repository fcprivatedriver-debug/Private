import Link from "next/link";
import { BrandLogo } from "@/components/layout/BrandLogo";
import {
  APP_NAME,
  ASSISTANT_NAME,
  APP_TAGLINE,
  APP_HERO_SUPPORT,
  ASSISTANT_LINE,
} from "@/config/brand";
import {
  NINA_CAPABILITIES,
  NINA_INPUT_CHANNELS,
} from "@/lib/ai/mission";
import { NATURAL_EXAMPLES } from "@/lib/ai/personality";

export default function LandingPage() {
  return (
    <div className="landing">
      <nav className="landing-nav">
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

      <section className="hero">
        <div className="hero-bg" aria-hidden />
        <div className="hero-content">
          <p className="hero-brand">{APP_NAME}</p>
          <h1>
            Sabe onde vai o teu dinheiro.
            <br />
            <span className="hero-mission-second">Agora.</span>
          </h1>
          <p>
            {APP_HERO_SUPPORT}
          </p>
          <p className="hero-promise">{ASSISTANT_LINE}</p>
          <div className="hero-ctas">
            <Link href="/pt/registo" className="btn btn-primary">
              Começar
            </Link>
            <Link href="/pt/login" className="btn btn-ghost">
              Já tenho conta
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <h2>Ver → Saber → Controlar → Decidir → Poupar</h2>
        <p className="section-lead">
          A {APP_NAME} transforma dados financeiros em conhecimento útil.
          A {ASSISTANT_NAME} ajuda-te a perceber esses dados em linguagem simples.
        </p>
        <div className="feature-grid nina-channels">
          {NINA_INPUT_CHANNELS.map((ch) => (
            <article key={ch.id} className="feature">
              <h3>{ch.label}</h3>
              <p className="muted">{ch.hint}</p>
            </article>
          ))}
        </div>
        <div className="feature-grid nina-examples" style={{ marginTop: "1.5rem" }}>
          {NATURAL_EXAMPLES.map((q) => (
            <article key={q} className="feature nina-example">
              <p>“{q}.”</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section section-adaptive" id="filosofia">
        <p className="section-eyebrow">O que consegues saber</p>
        <h2>{APP_TAGLINE}</h2>
        <p className="section-lead">
          Clareza, controlo, poupança, simplicidade e inteligência — sem parecer
          só um registo de despesas, nem uma app genérica de IA.
        </p>

        <div className="adaptive-flow">
          <article className="adaptive-block">
            <h3>O que tens</h3>
            <p>Saldo, receitas e a fotografia real do teu mês.</p>
          </article>
          <article className="adaptive-block">
            <h3>Quanto e onde gastas</h3>
            <p>Categorias, lojas e evolução — para decidires com factos.</p>
          </article>
          <article className="adaptive-block">
            <h3>Onde podes poupar</h3>
            <p>A {ASSISTANT_NAME} aponta padrões e oportunidades concretas.</p>
          </article>
          <article className="adaptive-block">
            <h3>Agora</h3>
            <p>Fala, escreve ou fotografa. A {APP_NAME} organiza; tu decides.</p>
          </article>
        </div>

        <ul className="mission-capabilities" aria-label={`O que a ${APP_NAME} faz`}>
          {NINA_CAPABILITIES.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </section>

      <section className="section section-cta">
        <h2>Pronto para saber agora?</h2>
        <p className="section-lead">
          {APP_NAME}. {APP_TAGLINE}
        </p>
        <Link href="/pt/registo" className="btn btn-primary">
          Criar conta
        </Link>
      </section>

      <footer className="landing-footer">
        <BrandLogo href="/pt" size="sm" />
        <p className="muted">
          {APP_NAME} · {APP_TAGLINE}
        </p>
        <div className="landing-footer-links">
          <Link href="/pt/termos">Termos</Link>
          <Link href="/pt/privacidade">Privacidade</Link>
        </div>
      </footer>
    </div>
  );
}
