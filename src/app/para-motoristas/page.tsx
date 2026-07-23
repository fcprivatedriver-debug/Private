import Link from "next/link";

export default function ParaMotoristasPage() {
  return (
    <section className="section fade-up">
      <div className="container">
        <h1 className="font-display" style={{ fontSize: "clamp(2rem,5vw,3rem)" }}>
          Conduz com a Movio
        </h1>
        <p className="lead">
          Vê pedidos abertos na tua zona, envia propostas com o teu preço e cresce com
          avaliações.
        </p>
        <div className="cta-row">
          <Link href="/registo?role=DRIVER" className="btn btn-primary">
            Registar como motorista
          </Link>
          <Link href="/login" className="btn btn-secondary">
            Já tenho conta
          </Link>
        </div>
      </div>
    </section>
  );
}
