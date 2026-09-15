import Link from "next/link";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { APP_NAME, ASSISTANT_NAME } from "@/config/brand";

export default function PrivacidadePage() {
  return (
    <div className="section">
      <BrandLogo href="/pt" />
      <h1 className="page-title" style={{ marginTop: "1.5rem" }}>
        Privacidade
      </h1>
      <p className="page-sub">
        A {APP_NAME} trata dados da tua conta (perfil, finanças que registas,
        conversas com a {ASSISTANT_NAME}, e preferências) para prestar o serviço.
      </p>
      <p className="page-sub">
        Os dados são transmitidos através de HTTPS. O acesso dentro da app
        respeita a tua sessão e, quando aplicável, as permissões do agregado
        familiar. Não afirmamos encriptação em repouso, backups automáticos ou
        integrações bancárias/retalho enquanto essas capacidades não estiverem
        activas e verificáveis na tua instalação.
      </p>
      <p className="page-sub">
        Podes pedir acesso ou eliminação dos teus dados através das definições
        da conta ou do contacto de suporte indicado na aplicação. Não vendemos
        os teus dados financeiros a terceiros.
      </p>
      <Link href="/pt" className="btn btn-ghost">
        Voltar
      </Link>
    </div>
  );
}
