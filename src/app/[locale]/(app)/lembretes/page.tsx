import Link from "next/link";

export default function RemindersPlaceholder() {
  return (
    <div className="panel anim-rise">
      <h1 className="page-title">Lembretes</h1>
      <p className="page-lead">
        Já podes criar lembretes por voz («lembra-me de…»). Os avisos activos e a lista completa activam-se no próximo módulo.
      </p>
      <Link href="/pt/captura" className="btn btn-primary btn-sm">
        Ir à captura
      </Link>
    </div>
  );
}
