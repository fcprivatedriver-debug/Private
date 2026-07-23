import Link from "next/link";

export default function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="hero-media" aria-hidden />
        <div className="container hero-content">
          <h1 className="hero-brand">
            Mov<span>io</span>
          </h1>
          <p className="hero-copy">
            Pedidos de viagem com motoristas privados. Publicas o trajeto, recebes
            propostas e escolhes a melhor — ao teu preço, ao teu ritmo.
          </p>
          <div className="cta-row">
            <Link href="/registo?role=CUSTOMER" className="btn btn-primary">
              Pedir viagem
            </Link>
            <Link href="/para-motoristas" className="btn btn-secondary">
              Sou motorista
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2>Três passos. Sem tarifas fixas escondidas.</h2>
          <p className="lead">
            A Movio funciona como um marketplace: o cliente define a viagem, os
            motoristas competem com propostas claras.
          </p>
          <div className="steps">
            <div>
              <div className="step-num">01</div>
              <h3>Publica o pedido</h3>
              <p className="muted">Origem, destino, data e detalhes do voo ou bagagem.</p>
            </div>
            <div>
              <div className="step-num">02</div>
              <h3>Recebe propostas</h3>
              <p className="muted">Motoristas verificados enviam preço e condições.</p>
            </div>
            <div>
              <div className="step-num">03</div>
              <h3>Escolhe a melhor</h3>
              <p className="muted">Compara e aceita. A reserva fica pronta.</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
