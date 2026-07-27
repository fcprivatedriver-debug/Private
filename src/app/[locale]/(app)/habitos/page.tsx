import Link from "next/link";

export default function HabitsPlaceholder() {
  return (
    <div className="panel anim-rise">
      <h1 className="page-title">Hábitos</h1>
      <p className="page-lead">
        Estrutura pronta na base de dados e no registo de módulos. A experiência completa chega em breve.
      </p>
      <Link href="/pt/hoje" className="btn btn-primary btn-sm">
        Voltar a Hoje
      </Link>
    </div>
  );
}
