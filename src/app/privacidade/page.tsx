export default function PrivacidadePage() {
  return (
    <section className="section fade-up">
      <div className="container" style={{ maxWidth: 720 }}>
        <h1 className="font-display" style={{ fontSize: "2.4rem" }}>
          Privacidade
        </h1>
        <p className="muted">Versão preliminar · Movio</p>
        <div className="panel" style={{ marginTop: "1.5rem", lineHeight: 1.6 }}>
          <p>
            Tratamos dados de conta (nome, email, telefone), pedidos de viagem e propostas para
            operar o marketplace.
          </p>
          <p>
            Os contactos entre cliente e motorista só são revelados após a aceitação de uma
            proposta.
          </p>
          <p>
            Podes pedir acesso ou eliminação dos teus dados contactando a equipa Movio. Esta página
            será atualizada antes do lançamento em produção.
          </p>
        </div>
      </div>
    </section>
  );
}
