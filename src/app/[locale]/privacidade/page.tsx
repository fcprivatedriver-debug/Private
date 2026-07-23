import Link from "next/link";
import { BrandLogo } from "@/components/layout/BrandLogo";

export default function PrivacidadePage() {
  return (
    <div className="section">
      <BrandLogo href="/pt" />
      <h1 className="page-title" style={{ marginTop: "1.5rem" }}>Privacidade</h1>
      <p className="page-sub">
        A MAFIL trata dados financeiros com encriptação em trânsito e em repouso,
        backups automáticos e controlo de permissões por membro da família.
        Integrações (Open Banking, retalho, energia) só avançam com autorização explícita.
      </p>
      <Link href="/pt" className="btn btn-ghost">Voltar</Link>
    </div>
  );
}
