export default function TermosPage() {
  return (
    <section className="section fade-up">
      <div className="container" style={{ maxWidth: 720 }}>
        <h1 className="font-display" style={{ fontSize: "2.4rem" }}>
          Termos de utilização
        </h1>
        <p className="muted">Versão preliminar · Movio</p>
        <div className="panel" style={{ marginTop: "1.5rem", lineHeight: 1.6 }}>
          <p>
            A Movio é um marketplace que liga clientes a motoristas privados. A plataforma não é
            transportadora: facilita pedidos, propostas e reservas.
          </p>
          <p>
            Os utilizadores são responsáveis pela exatidão das informações publicadas e pelo
            cumprimento da legislação aplicável ao transporte de passageiros.
          </p>
          <p>
            Cancelamentos, reembolsos e pagamentos serão regulados em detalhe quando a integração
            Stripe Connect estiver ativa.
          </p>
        </div>
      </div>
    </section>
  );
}
