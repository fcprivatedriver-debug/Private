import Link from "next/link";
import { BrandLogo } from "@/components/layout/BrandLogo";
import {
  NINA_MISSION,
  NINA_CAPABILITIES,
  NINA_INPUT_CHANNELS,
  NINA_PURPOSE,
} from "@/lib/ai/mission";
import { NATURAL_EXAMPLES } from "@/lib/ai/personality";

export default function LandingPage() {
  const [missionLive, missionAccounts] = NINA_MISSION.split("\n");

  return (
    <div className="landing">
      <nav className="landing-nav">
        <BrandLogo href="/pt" size="md" />
        <div className="landing-nav-actions">
          <Link href="/pt/login" className="btn btn-ghost btn-sm">
            Entrar
          </Link>
          <Link href="/pt/registo" className="btn btn-primary btn-sm">
            Conhecer a Nina
          </Link>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-bg" aria-hidden />
        <div className="hero-content">
          <p className="hero-brand">Nina</p>
          <h1>
            {missionLive}
            <br />
            <span className="hero-mission-second">{missionAccounts}</span>
          </h1>
          <p>
            Assistente financeira inteligente que te acompanha todos os dias — para o dinheiro deixar
            de ser uma preocupação.
          </p>
          <div className="hero-ctas">
            <Link href="/pt/registo" className="btn btn-primary">
              Começar com a Nina
            </Link>
            <Link href="/pt/login" className="btn btn-ghost">
              Já tenho conta
            </Link>
          </div>
          <p className="hero-promise">{NINA_PURPOSE}</p>
        </div>
      </section>

      <section className="section">
        <h2>Fala naturalmente — voz, texto ou fotografia</h2>
        <p className="section-lead">
          A Nina interpreta a intenção e executa. Tu não aprendes a app; a app adapta-se a ti.
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
        <p className="section-eyebrow">Filosofia</p>
        <h2>Alguém ao teu lado, a organizar as contas</h2>
        <p className="section-lead">
          A Nina compreende, organiza, aprende e antecipa — para tu viveres com mais tranquilidade.
        </p>

        <div className="adaptive-flow">
          <article className="adaptive-block">
            <h3>Compreende e executa</h3>
            <p>
              Diz o que aconteceu. A Nina classifica, regista e atualiza saldos, orçamentos e
              objetivos — sem formulários.
            </p>
          </article>
          <article className="adaptive-block">
            <h3>Aprende contigo</h3>
            <p>
              Quanto mais a usas, menos perguntas faz. Memoriza hábitos, lojas e o que é pessoal ou
              familiar.
            </p>
          </article>
          <article className="adaptive-block">
            <h3>Antecipa e sugere</h3>
            <p>
              Tarefa repetitiva? Sugere automatizar. Há folga? Propõe reforçar poupanças. Orçamento a
              apertar? Avisa com calma e soluções.
            </p>
          </article>
          <article className="adaptive-block">
            <h3>Simplifica sempre</h3>
            <p>
              IA para reduzir cliques e burocracia. Sempre que existirem duas formas, escolhe a mais
              simples.
            </p>
          </article>
        </div>

        <ul className="mission-capabilities" aria-label="O que a Nina faz">
          {NINA_CAPABILITIES.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>

        <p className="adaptive-philosophy">{NINA_MISSION.replace("\n", " ")}</p>
      </section>

      <section className="section">
        <h2>O dia a dia, tratado</h2>
        <p className="section-lead">
          Captura Instantânea, Conta Familiar, objetivos e resumos — sempre em linguagem humana.
        </p>
        <div className="feature-grid">
          {[
            {
              title: "Captura Instantânea",
              body: "Fala, escreve ou fotografa. Em segundos está feito.",
            },
            {
              title: "Organiza sozinha",
              body: "Explica para onde vai o dinheiro — sem culpas, só clareza.",
            },
            {
              title: "Ajuda a poupar",
              body: "Quando há margem, sugere reforçar objetivos. Quando há risco, acompanha.",
            },
          ].map((f) => (
            <article key={f.title} className="feature">
              <h3>{f.title}</h3>
              <p className="muted">{f.body}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="landing-footer">
        <p>
          Nina · {missionLive} {missionAccounts} ·{" "}
          <Link href="/pt/privacidade">Privacidade</Link> ·{" "}
          <Link href="/pt/termos">Termos</Link>
        </p>
      </footer>
    </div>
  );
}
