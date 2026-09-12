import Link from "next/link";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { APP_NAME, ASSISTANT_NAME } from "@/config/brand";

export default function TermosPage() {
  return (
    <div className="section">
      <BrandLogo href="/pt" />
      <h1 className="page-title" style={{ marginTop: "1.5rem" }}>
        Termos de utilização
      </h1>
      <p className="page-sub">
        A {APP_NAME} é uma aplicação de organização pessoal e financeira. Inclui a{" "}
        {ASSISTANT_NAME}, assistente inteligente para te ajudar a compreender
        receitas, despesas, categorias, objectivos, hábitos, compras e agenda.
      </p>
      <p className="page-sub">
        Os dados que decides partilhar (incluindo importações ou fotografias de
        faturas) dependem das tuas autorizações e das integrações efectivamente
        disponíveis. A informação apresentada não substitui aconselhamento
        financeiro profissional.
      </p>
      <p className="page-sub">
        És responsável pela exactidão dos dados que registas e pelo uso adequado
        da conta. A {APP_NAME} pode actualizar estes termos; alterações relevantes
        serão comunicadas na aplicação.
      </p>
      <Link href="/pt" className="btn btn-ghost">
        Voltar
      </Link>
    </div>
  );
}
