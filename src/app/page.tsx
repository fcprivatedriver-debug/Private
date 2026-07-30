import Link from "next/link";
import { ZeluWordmark } from "@/components/layout/BrandLogo";
import { BRAND_NAME, BRAND_TAGLINE_PT, BRAND_VALUES } from "@/config/brand";

export default function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="hero-media" aria-hidden />
        <div className="container hero-content">
          <h1 className="hero-brand">
            <ZeluWordmark as="span" tone="on-dark" showMark markSize={56} />
          </h1>
          <p className="hero-tagline">
            {BRAND_TAGLINE_PT.line1}
            <br />
            {BRAND_TAGLINE_PT.line2}
          </p>
          <p className="hero-copy">
            Chauffeurs privados com excelência e discrição. Publicas o trajeto, recebes propostas e
            escolhes com confiança — ao teu ritmo.
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
          <h2>Três passos. Controlo total.</h2>
          <p className="lead">
            A {BRAND_NAME} funciona como um marketplace: o cliente define a viagem, os motoristas
            competem com propostas claras — com profissionalismo e empatia em cada detalhe.
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
          <p className="muted" style={{ marginTop: "2.5rem", fontSize: "0.92rem", maxWidth: "40rem" }}>
            {BRAND_VALUES.join(" · ")}
          </p>
        </div>
      </section>
    </>
  );
}
