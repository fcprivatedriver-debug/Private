import type { Metadata } from "next";
import { BRAND } from "@/config/brand";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description: "Como a FC Private Driver trata os dados enviados pelo formulário de contacto.",
};

export default function PrivacidadePage() {
  return (
    <section className="section fade-up">
      <div className="container prose">
        <span className="section-eyebrow">Legal</span>
        <h1 className="section-title">Política de Privacidade</h1>
        <p>
          A FC Private Driver respeita a sua privacidade. Recolhemos apenas a informação necessária
          para responder a pedidos de serviço ou orçamento enviados através deste website.
        </p>
        <h2>Que dados recolhemos</h2>
        <p>
          Quando utiliza o formulário «Pedir serviço», pode indicar nome, telefone, email, serviço
          pretendido, data, hora, local de recolha, destino e observações. Estes dados são enviados
          por si via WhatsApp ou email para {BRAND.email} / {BRAND.phoneDisplay}.
        </p>
        <h2>Finalidade</h2>
        <p>
          Os dados servem exclusivamente para analisar o pedido, preparar uma proposta e confirmar o
          serviço consigo. Não vendemos nem partilhamos os seus dados com terceiros para fins de
          marketing.
        </p>
        <h2>Base legal e conservação</h2>
        <p>
          O tratamento assenta no seu consentimento e no interesse legítimo em responder ao pedido.
          Conservamos a informação apenas pelo tempo necessário à gestão do pedido e às obrigações
          legais aplicáveis.
        </p>
        <h2>Os seus direitos</h2>
        <p>
          Pode pedir acesso, retificação ou eliminação dos seus dados, contactando-nos em{" "}
          <a href={`mailto:${BRAND.email}`}>{BRAND.email}</a> ou pelo telefone{" "}
          <a href={`tel:${BRAND.phoneTel}`}>{BRAND.phoneDisplay}</a>.
        </p>
        <h2>Contacto</h2>
        <p>
          FC Private Driver
          <br />
          Email: {BRAND.email}
          <br />
          WhatsApp / Telefone: {BRAND.phoneDisplay}
        </p>
      </div>
    </section>
  );
}
