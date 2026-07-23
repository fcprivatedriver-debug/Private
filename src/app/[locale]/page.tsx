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
            Começar
          </Link>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-bg" aria-hidden />
        <div className="hero-content">
          <p className="hero-brand">MAFIL</p>
          <h1>Gestão financeira familiar, com clareza.</h1>
          <p>
            Controlo receitas, despesas e objetivos da família num só lugar —
            simples, seguro e feito para Portugal.
          </p>
          <div className="hero-ctas">
            <Link href="/pt/registo" className="btn btn-primary">
              Criar conta familiar
            </Link>
            <Link href="/pt/login" className="btn btn-ghost">
              Entrar na demo
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <h2>Tudo o que a família precisa</h2>
        <p className="section-lead">
          Da fatura do supermercado ao objetivo das férias — organizado, sincronizado e inteligente.
        </p>
        <div className="feature-grid">
          {[
            {
              title: "Dashboard claro",
              body: "Saldo do mês, orçamento utilizado, últimas despesas e próximos pagamentos num olhar.",
            },
            {
              title: "OCR de faturas",
              body: "Fotografe a fatura e confirme loja, valor, IVA e categoria sugerida automaticamente.",
            },
            {
              title: "Importações PT",
              body: "Arquitetura pronta para Continente, Galp, Via Verde, MB Way, Revolut e Open Banking.",
            },
            {
              title: "Orçamentos com alertas",
              body: "Defina limites por categoria e receba avisos aos 75%, 90% e 100%.",
            },
            {
              title: "IA financeira",
              body: "Hábitos, anomalias, previsão de saldo e sugestões personalizadas de poupança.",
            },
            {
              title: "Multiutilizador",
              body: "Vários membros da família, permissões e despesas próprias — tudo sincronizado.",
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
          MAFIL · Gestão Financeira Familiar ·{" "}
          <Link href="/pt/privacidade">Privacidade</Link> ·{" "}
          <Link href="/pt/termos">Termos</Link>
        </p>
      </footer>
    </div>
  );
}
