import type { Metadata } from "next";
import Link from "next/link";
import { BRAND } from "@/config/brand";

export const metadata: Metadata = {
  title: "Sobre",
  description: "Conheça a FC Private Driver — motorista privado e personalizado.",
};

export default function SobrePage() {
  return (
    <section className="section fade-up">
      <div className="container prose">
        <span className="section-eyebrow">Sobre</span>
        <h1 className="section-title">FC Private Driver</h1>
        <p>
          A FC Private Driver é um serviço de motorista privado e personalizado. Não somos uma
          aplicação de táxi, nem um marketplace com vários motoristas. Somos um contacto direto —
          alguém de confiança a quem pode telefonar quando precisa.
        </p>
        <h2>Como funciona</h2>
        <p>
          Conhece os serviços, escolhe o que pretende e contacta-nos. Analisamos o pedido, definimos
          o preço e confirmamos o serviço diretamente consigo. Cada serviço é personalizado — sem
          preços automáticos no site.
        </p>
        <h2>Valores</h2>
        <p>
          Confiança, profissionalismo, responsabilidade, educação, disponibilidade, empatia e
          discrição. Mobilidade privada com proximidade e atenção ao detalhe.
        </p>
        <div className="contact-strip-actions" style={{ marginTop: "0.5rem" }}>
          <a
            href={BRAND.whatsappUrl}
            className="btn btn-whatsapp"
            target="_blank"
            rel="noopener noreferrer"
          >
            Falar no WhatsApp
          </a>
          <Link href="/contactos" className="btn btn-primary">
            Pedir serviço
          </Link>
        </div>
      </div>
    </section>
  );
}
