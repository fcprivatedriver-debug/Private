import type { Metadata } from "next";
import Link from "next/link";
import { SERVICES } from "@/data/services";

export const metadata: Metadata = {
  title: "Serviços",
  description:
    "Jovens, Sénior, Business, Executivo, Logístico, Diversão & Lazer, Pet, Transfers, Turismo & Passeios e Motorista à Disposição.",
};

export default function ServicosPage() {
  return (
    <section className="section fade-up">
      <div className="container">
        <div className="section-head">
          <span className="section-eyebrow">Serviços</span>
          <h1 className="section-title">O serviço certo para cada momento</h1>
          <p className="section-lead">
            Escolha a categoria que melhor descreve o que precisa. Depois contacte-nos — analisamos o
            pedido, definimos o preço e confirmamos o serviço consigo.
          </p>
          <p className="muted" style={{ marginTop: "0.75rem" }}>
            Serviço personalizado. Orçamento personalizado.
          </p>
        </div>

        {SERVICES.map((service) => (
          <article key={service.id} id={service.id} className="service-detail">
            <div>
              <h2>{service.name}</h2>
              <p className="muted" style={{ marginTop: "0.55rem", maxWidth: "46ch" }}>
                {service.description}
              </p>
            </div>

            <div>
              <p className="section-eyebrow">Exemplos</p>
              <div className="chip-row">
                {service.examples.map((ex) => (
                  <span key={ex} className="chip">
                    {ex}
                  </span>
                ))}
              </div>
            </div>

            {service.highlights && (
              <div>
                <p className="section-eyebrow">Destaques</p>
                <div className="chip-row">
                  {service.highlights.map((h) => (
                    <span key={h} className="chip">
                      {h}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {service.note && <p className="muted">{service.note}</p>}

            <Link href={`/contactos?servico=${service.id}`} className="btn btn-primary">
              {service.cta || "Pedir este serviço"}
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
