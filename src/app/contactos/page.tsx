import type { Metadata } from "next";
import { Suspense } from "react";
import { BRAND } from "@/config/brand";
import { ContactForm } from "@/components/forms/ContactForm";

export const metadata: Metadata = {
  title: "Contactos",
  description: "Peça serviço ou orçamento à FC Private Driver por WhatsApp, telefone ou email.",
};

export default function ContactosPage() {
  return (
    <section className="section fade-up">
      <div className="container" style={{ display: "grid", gap: "2rem" }}>
        <div className="section-head" style={{ marginBottom: 0 }}>
          <span className="section-eyebrow">Contactos</span>
          <h1 className="section-title">Estamos disponíveis</h1>
          <p className="section-lead">
            WhatsApp / Telefone:{" "}
            <a href={`tel:${BRAND.phoneTel}`} style={{ textDecoration: "underline" }}>
              {BRAND.phoneDisplay}
            </a>
            <br />
            Email:{" "}
            <a href={`mailto:${BRAND.email}`} style={{ textDecoration: "underline" }}>
              {BRAND.email}
            </a>
          </p>
          <div className="hero-actions" style={{ marginTop: "1.1rem" }}>
            <a
              href={BRAND.whatsappUrl}
              className="btn btn-whatsapp"
              target="_blank"
              rel="noopener noreferrer"
            >
              Falar no WhatsApp
            </a>
            <a href={`tel:${BRAND.phoneTel}`} className="btn btn-secondary">
              Telefonar
            </a>
            <a href={`mailto:${BRAND.email}`} className="btn btn-secondary">
              Enviar email
            </a>
          </div>
        </div>

        <Suspense fallback={<div className="contact-form-shell">A carregar formulário…</div>}>
          <ContactForm />
        </Suspense>
      </div>
    </section>
  );
}
