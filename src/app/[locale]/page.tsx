import Link from "next/link";
import { BrandLogo } from "@/components/layout/BrandLogo";

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
            Conhecer a Nina
          </Link>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-bg" aria-hidden />
        <div className="hero-content">
          <p className="hero-brand">Nina</p>
          <h1>A assistente que trata das contas por ti.</h1>
          <p>
            O dinheiro não deve ser uma preocupação. Deve ser uma ferramenta para viver melhor.
            A Nina simplifica tudo — com calma, clareza e inteligência artificial.
          </p>
          <div className="hero-ctas">
            <Link href="/pt/registo" className="btn btn-primary">
              Começar com a Nina
            </Link>
            <Link href="/pt/login" className="btn btn-ghost">
              Já tenho conta
            </Link>
          </div>
          <p className="hero-promise">
            “A Nina trata das contas para que tu possas aproveitar a vida.”
          </p>
        </div>
      </section>

      <section className="section">
        <h2>Fala com a Nina como falas com uma amiga</h2>
        <p className="section-lead">
          Sem menus complicados. Sem linguagem técnica. Só perguntas naturais — e respostas claras.
        </p>
        <div className="feature-grid nina-examples">
          {[
            "Nina, quanto gastei este mês?",
            "Nina, quanto posso gastar até ao final do mês?",
            "Nina, onde posso poupar?",
            "Nina, compara este mês com o anterior.",
            "Nina, quanto falta para o objetivo de férias?",
            "Nina, mostra as despesas do supermercado.",
          ].map((q) => (
            <article key={q} className="feature nina-example">
              <p>{q}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <h2>O que a Nina faz por ti</h2>
        <p className="section-lead">
          Organiza despesas, classifica compras, deteta o fora do normal e motiva-te — sem julgamentos.
        </p>
        <div className="feature-grid">
          {[
            {
              title: "Conta familiar partilhada",
              body: "Casal, filhos ou amigos — todos falam com a Nina e veem o mesmo saldo, objetivos e avisos em tempo real.",
            },
            {
              title: "Organiza sozinha",
              body: "Classifica compras e explica para onde está a ir o dinheiro, em linguagem simples.",
            },
            {
              title: "Ajuda a poupar em conjunto",
              body: "Objetivos partilhados e progresso automático quando a família poupa ou fica abaixo do orçamento.",
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
          Nina · Assistente financeira pessoal ·{" "}
          <Link href="/pt/privacidade">Privacidade</Link> ·{" "}
          <Link href="/pt/termos">Termos</Link>
        </p>
      </footer>
    </div>
  );
}
