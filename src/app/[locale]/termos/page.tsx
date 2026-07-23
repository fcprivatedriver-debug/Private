import Link from "next/link";
import { BrandLogo } from "@/components/layout/BrandLogo";

export default function TermosPage() {
  return (
    <div className="section">
      <BrandLogo href="/pt" />
      <h1 className="page-title" style={{ marginTop: "1.5rem" }}>Termos de utilização</h1>
      <p className="page-sub">
        A Nina é uma ferramenta de gestão financeira familiar. Os dados importados
        de terceiros dependem das autorizações do utilizador e das APIs disponíveis.
        A informação apresentada não substitui aconselhamento financeiro profissional.
      </p>
      <Link href="/pt" className="btn btn-ghost">Voltar</Link>
    </div>
  );
}
