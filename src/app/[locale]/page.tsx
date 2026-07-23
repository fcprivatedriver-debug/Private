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
            “Quanto mais a utilizas, menos trabalho tens.”
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

      <section className="section section-adaptive" id="experiencia-inteligente">
        <p className="section-eyebrow">Experiência & inteligência</p>
        <h2>Melhoria da Experiência do Utilizador e Inteligência Adaptativa da Nina</h2>
        <p className="section-lead">
          Uma única funcionalidade integrada: adesão simples, Conta Familiar partilhada e uma
          assistente que aprende contigo — até quase não precisares de perguntar nada.
        </p>

        <div className="adaptive-flow">
          <article className="adaptive-block">
            <h3>Adesão em segundos</h3>
            <p>
              Regista-te com email (ou Google / Apple) e autenticação segura. Cria a Conta Familiar
              com um toque; a Nina gera um convite por link ou QR Code. Quem aceita fica logo ligado —
              sem códigos nem configuração técnica.
            </p>
          </article>

          <article className="adaptive-block">
            <h3>Perfis próprios, casa partilhada</h3>
            <p>
              Cada membro tem nome, fotografia, preferências e autenticação própria (PIN, impressão
              digital ou reconhecimento facial). As Minhas Finanças e a Conta Familiar ficam
              separadas: o que é teu e o que é de todos.
            </p>
          </article>

          <article className="adaptive-block">
            <h3>Compreensão automática</h3>
            <p>
              A Nina entende se um gasto é pessoal, familiar ou profissional. Confirma só quando há
              dúvida; com as tuas respostas, aprende hábitos, lojas, horários e categorias — e
              automatiza cada vez mais.
            </p>
          </article>

          <article className="adaptive-block">
            <h3>Memória, sugestões e ligações</h3>
            <p>
              Define regras e recebe sugestões úteis. No Centro de Ligações ativa só o que quiseres —
              banco, email, supermercados — ou continua só por voz. Nada é obrigatório.
            </p>
          </article>
        </div>

        <p className="adaptive-philosophy">
          Quanto mais a Nina é utilizada, menos trabalho o utilizador tem.
        </p>
      </section>

      <section className="section">
        <h2>Também trata do dia a dia</h2>
        <p className="section-lead">
          Orçamentos, objetivos, OCR de faturas, importações e resumos — sempre em linguagem simples.
        </p>
        <div className="feature-grid">
          {[
            {
              title: "Organiza sozinha",
              body: "Classifica compras e explica para onde está a ir o dinheiro.",
            },
            {
              title: "Ajuda a poupar",
              body: "Objetivos partilhados e progresso automático quando a família poupa.",
            },
            {
              title: "Avisa a tempo",
              body: "Limites, pagamentos e despesas invulgares — com tom amigável.",
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
