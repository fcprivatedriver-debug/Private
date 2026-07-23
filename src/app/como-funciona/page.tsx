export default function ComoFuncionaPage() {
  return (
    <section className="section fade-up">
      <div className="container">
        <h1 className="font-display" style={{ fontSize: "clamp(2rem,5vw,3rem)" }}>
          Como funciona a Movio
        </h1>
        <p className="lead">
          Um marketplace de motoristas privados: o cliente publica, os motoristas
          propõem, o cliente decide.
        </p>
        <div className="steps">
          <article>
            <div className="step-num">01</div>
            <h2>Pedido de viagem</h2>
            <p className="muted">
              Indica origem, destino, horário, passageiros e preferências de veículo.
            </p>
          </article>
          <article>
            <div className="step-num">02</div>
            <h2>Propostas</h2>
            <p className="muted">
              Motoristas ativos enviam preço total, veículo e mensagem. Podes comparar.
            </p>
          </article>
          <article>
            <div className="step-num">03</div>
            <h2>Aceitação</h2>
            <p className="muted">
              Ao aceitar, cria-se a reserva. Pagamentos Stripe ficam preparados para a
              próxima fase.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}
