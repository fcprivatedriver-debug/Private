"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BRAND } from "@/config/brand";

const NAV = [
  { href: "/", label: "Início" },
  { href: "/servicos", label: "Serviços" },
  { href: "/sobre", label: "Sobre" },
  { href: "/contactos", label: "Contactos" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="site-header">
      <div className="container site-header-inner">
        <Link href="/" className="brand-logo" aria-label={BRAND.name} onClick={() => setOpen(false)}>
          <Image src={BRAND.logo} alt="" width={28} height={28} priority />
          <span>FC Private Driver</span>
        </Link>

        <button
          type="button"
          className="nav-toggle"
          aria-expanded={open}
          aria-controls="site-nav"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="sr-only">Menu</span>
          <span className={`nav-toggle-bars${open ? " is-open" : ""}`} aria-hidden />
        </button>

        <nav id="site-nav" className={`nav-links${open ? " is-open" : ""}`}>
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={pathname === item.href ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          <a
            href={BRAND.whatsappUrl}
            className="btn btn-whatsapp btn-sm"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
          >
            Falar no WhatsApp
          </a>
          <Link href="/contactos" className="btn btn-primary btn-sm" onClick={() => setOpen(false)}>
            Pedir serviço
          </Link>
        </nav>
      </div>
    </header>
  );
}
