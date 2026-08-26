import Image from "next/image";
import Link from "next/link";
import { BRAND } from "@/config/brand";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container site-footer-inner">
        <div className="site-footer-grid">
          <div>
            <Link href="/" className="brand-logo brand-logo-on-dark" aria-label={BRAND.name}>
              <Image src={BRAND.logoLight} alt="" width={24} height={24} />
              <span>FC Private Driver</span>
            </Link>
            <p className="footer-tagline">
              Motorista privado e personalizado — confiança, discrição e proximidade.
            </p>
          </div>

          <div>
            <p className="footer-heading">Navegação</p>
            <div className="site-footer-links">
              <Link href="/servicos">Serviços</Link>
              <Link href="/frota">Frota</Link>
              <Link href="/sobre">Sobre</Link>
              <Link href="/contactos">Contactos</Link>
              <Link href="/privacidade">Política de Privacidade</Link>
            </div>
          </div>

          <div>
            <p className="footer-heading">Contactos</p>
            <p className="footer-contact">
              WhatsApp / Telefone
              <br />
              <a href={`tel:${BRAND.phoneTel}`}>{BRAND.phoneDisplay}</a>
              <br />
              <a href={`mailto:${BRAND.email}`}>{BRAND.email}</a>
            </p>
          </div>
        </div>
        <p className="footer-copy">
          © {new Date().getFullYear()} FC Private Driver. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
}
