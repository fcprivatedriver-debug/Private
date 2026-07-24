import { Link } from "@/i18n/navigation";

export const dynamic = "force-dynamic";

const STEPS = [
  {
    title: "1. Registo de cliente + verificação de email",
    body: "Abra /registo, escolha «Quero viajar», preencha nome, email e palavra-passe. A conta fica pendente até confirmar o email.",
    links: [
      { href: "/registo", label: "Criar conta cliente" },
      { href: "/demo/emails", label: "Abrir caixa de emails" },
    ],
    checks: [
      "Após registo, aparece o ecrã «Verifique o email».",
      "Na caixa demo, abra «Ative a sua conta ZRIK» e clique em ATIVAR CONTA.",
      "A página confirma a ativação; o email «Conta ZRIK ativada» é gerado.",
      "Só depois disso o login funciona.",
    ],
  },
  {
    title: "2. Registo de motorista (modo demo)",
    body: "Numa janela anónima (ou outro browser), registe um motorista, ative o email, faça upload de documentos no onboarding e peça aprovação ao admin.",
    links: [
      { href: "/registo?role=DRIVER", label: "Criar conta motorista" },
      { href: "/login", label: "Login admin" },
    ],
    checks: [
      "Login admin: admin@movio.app / movio123",
      "Admin → Verificações → aprovar o motorista.",
      "Email «Motorista aprovado» aparece na caixa demo.",
      "Atalho: use motorista@movio.app (já aprovado) se quiser saltar o onboarding.",
    ],
  },
  {
    title: "3–4. Cliente publica viagem · motorista recebe",
    body: "Com o cliente autenticado, peça uma viagem e publique. O motorista vê o pedido em Pedidos abertos.",
    links: [
      { href: "/pedidos/novo", label: "Pedir viagem" },
      { href: "/pedidos-abertos", label: "Pedidos abertos (motorista)" },
    ],
    checks: [
      "Email «Pedido de viagem criado» para o cliente.",
      "Motorista vê o pedido OPEN na lista.",
    ],
  },
  {
    title: "5–6. Proposta e aceitação",
    body: "Motorista envia proposta com preço. Cliente compara e aceita.",
    links: [
      { href: "/propostas", label: "Propostas do motorista" },
      { href: "/pedidos", label: "Pedidos do cliente" },
    ],
    checks: [
      "Email «Nova proposta recebida» para o cliente.",
      "Após aceitar: email «Proposta aceite» para o motorista.",
      "Estado do pedido: OFFER_ACCEPTED / reserva PENDING_PAYMENT.",
    ],
  },
  {
    title: "7. Pagamento Sandbox",
    body: "No checkout, confirme o pagamento em modo Sandbox (sem dinheiro real). Stripe Live/Test fica disponível quando PAYMENTS_ENABLED=true e as chaves estiverem definidas.",
    links: [{ href: "/demo/emails", label: "Ver emails de pagamento" }],
    checks: [
      "Botão «Confirmar pagamento (Sandbox)».",
      "Emails «Pagamento confirmado» para cliente e motorista.",
      "Reserva PAID · viagem CONFIRMED.",
    ],
  },
  {
    title: "8–9. Simular a viagem",
    body: "Na página da viagem, avance os estados: Aguarda motorista → a caminho → chegou → iniciada → concluída.",
    links: [{ href: "/viagens", label: "Viagens (motorista)" }],
    checks: [
      "DRIVER_EN_ROUTE → DRIVER_ARRIVED → IN_PROGRESS → COMPLETED.",
      "Emails «Viagem iniciada» e «Viagem concluída».",
    ],
  },
  {
    title: "10. Recibo, histórico e emails",
    body: "No fim, confirme recibo/confirmação, histórico de viagens e registos de pagamento.",
    links: [
      { href: "/pedidos", label: "Histórico cliente" },
      { href: "/demo/emails", label: "Caixa de emails" },
    ],
    checks: [
      "Página de confirmação / recibo da viagem.",
      "Histórico do cliente e do motorista atualizados.",
      "Toda a sequência de emails na caixa demo.",
    ],
  },
];

export default function DemoE2EGuidePage() {
  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 820 }}>
        <h1 className="page-title">Guia de teste E2E</h1>
        <p className="page-lead">
          Ambiente de demonstração para validar o fluxo completo como em produção — sem novas
          funcionalidades de produto. Pagamentos em Sandbox; emails sempre na caixa demo (Resend
          opcional).
        </p>

        <div className="panel" style={{ marginBottom: "1.5rem" }}>
          <div className="label-sm" style={{ marginBottom: "0.5rem" }}>
            Contas demo já ativas
          </div>
          <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>
            <li>
              <code>cliente@movio.app</code> / <code>movio123</code>
            </li>
            <li>
              <code>motorista@movio.app</code> / <code>movio123</code>
            </li>
            <li>
              <code>admin@movio.app</code> / <code>movio123</code>
            </li>
          </ul>
          <p className="muted" style={{ margin: "0.75rem 0 0", fontSize: "0.88rem" }}>
            Contas novas ficam pendentes até clicar em ATIVAR CONTA no email.
          </p>
        </div>

        <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "1.25rem" }}>
          {STEPS.map((step) => (
            <li key={step.title} className="panel">
              <h2 style={{ margin: "0 0 0.5rem", fontSize: "1.15rem" }}>{step.title}</h2>
              <p className="muted" style={{ marginTop: 0 }}>
                {step.body}
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.75rem" }}>
                {step.links.map((l) => (
                  <Link key={l.href} href={l.href} className="btn btn-secondary btn-sm">
                    {l.label}
                  </Link>
                ))}
              </div>
              <ul style={{ margin: 0, paddingLeft: "1.2rem", fontSize: "0.92rem" }}>
                {step.checks.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </li>
          ))}
        </ol>

        <div className="panel" style={{ marginTop: "1.5rem" }}>
          <h2 style={{ margin: "0 0 0.5rem", fontSize: "1.05rem" }}>Emails cobertos</h2>
          <p className="muted" style={{ margin: 0, fontSize: "0.92rem" }}>
            Verificação · Conta ativada · Pedido criado · Nova proposta · Proposta aceite ·
            Pagamento confirmado · Viagem iniciada · Viagem concluída · Motorista aprovado
          </p>
        </div>

        <p className="muted" style={{ marginTop: "1.5rem" }}>
          Documentação: <code>docs/E2E_DEMO_GUIDE.md</code>
        </p>
      </div>
    </section>
  );
}
