import Link from "next/link";
import { BRAND, PAYMENT_METHODS } from "@/config/brand";
import { FLEET, FLEET_INTRO } from "@/data/fleet";
import { SERVICES } from "@/data/services";
import { FleetVehicle } from "@/components/site/FleetVehicle";
import { ServicesExplorer } from "@/components/site/ServicesExplorer";

export default function HomePage() {
  return (
    <>
      <section className="hero">
        <div className="hero-media" aria-hidden />
        <div className="container hero-content">
          <h1 className="hero-brand">FC Private Driver</h1>
          <p className="hero-title">Mobilidade privada. Serviço personalizado.</p>
          <p className="hero-sub">{BRAND.subtitle}</p>
          <div className="hero-actions">
            <Link href="/servicos" className="btn btn-primary">
              Ver serviços
            </Link>
            <a
              href={BRAND.whatsappUrl}
              className="btn btn-whatsapp"
              target="_blank"
              rel="noopener noreferrer"
            >
              Falar no WhatsApp
            </a>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <span className="section-eyebrow">A nossa abordagem</span>
            <h2 className="section-title">Tenho um motorista de confiança a quem telefono quando preciso.</h2>
            <p className="section-lead">
              A FC Private Driver é um serviço de motorista privado e personalizado. Conheça os
              serviços, escolha o que precisa e fale connosco — analisamos o pedido, definimos o
              preço e confirmamos diretamente consigo.
            </p>
            <div className="values">
              {[
                "Confiança",
                "Profissionalismo",
                "Responsabilidade",
                "Educação",
                "Disponibilidade",
                "Empatia",
                "Discrição",
              ].map((v) => (
                <span key={v}>{v}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section section-tight" id="servicos-resumo">
        <div className="container">
          <div className="section-head">
            <span className="section-eyebrow">Serviços</span>
            <h2 className="section-title">Para cada momento do seu dia</h2>
            <p className="section-lead">
              Serviço personalizado. Orçamento personalizado. Contacte-nos para receber uma proposta
              adaptada ao que pretende.
            </p>
          </div>
          <ServicesExplorer services={SERVICES} />
          <p style={{ marginTop: "1.75rem" }}>
            <Link href="/servicos" className="btn btn-secondary">
              Ver todos os serviços
            </Link>
          </p>
        </div>
      </section>

      <section className="section" id="frota-resumo">
        <div className="container">
          <div className="section-head">
            <span className="section-eyebrow">Frota</span>
            <h2 className="section-title">{FLEET_INTRO}</h2>
            <p className="section-lead">
              Tesla Model 3 e Model Y — conforto elétrico, silêncio e apresentação cuidada em cada
              deslocação.
            </p>
          </div>
          <div className="fleet-grid">
            {FLEET.map((vehicle) => (
              <FleetVehicle key={vehicle.id} vehicle={vehicle} />
            ))}
          </div>
          <p style={{ marginTop: "1.5rem" }}>
            <Link href="/frota" className="btn btn-secondary">
              Ver frota
            </Link>
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container" style={{ display: "grid", gap: "1.25rem" }}>
          <div className="contact-strip fade-up">
            <div>
              <h2>Fale connosco</h2>
              <p style={{ marginTop: "0.5rem", opacity: 0.88, maxWidth: "36ch" }}>
                WhatsApp e telefone {BRAND.phoneDisplay}. Email {BRAND.email}.
              </p>
            </div>
            <div className="contact-strip-actions">
              <a
                href={BRAND.whatsappUrl}
                className="btn btn-whatsapp"
                target="_blank"
                rel="noopener noreferrer"
              >
                Falar no WhatsApp
              </a>
              <a href={`tel:${BRAND.phoneTel}`} className="btn btn-ghost">
                Telefonar
              </a>
              <a href={`mailto:${BRAND.email}`} className="btn btn-ghost">
                Enviar email
              </a>
              <Link href="/contactos" className="btn btn-ghost">
                Pedir serviço
              </Link>
            </div>
          </div>

          <div className="payments-box">
            <span className="section-eyebrow">Formas de pagamento</span>
            <h2 className="section-title" style={{ fontSize: "1.55rem" }}>
              Após confirmação do serviço
            </h2>
            <p className="muted">
              Após confirmação do serviço, disponibilizamos diferentes formas de pagamento. O
              pagamento é acordado e efetuado posteriormente entre o cliente e a FC Private Driver —
              sem checkout no site.
            </p>
            <ul>
              {PAYMENT_METHODS.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
