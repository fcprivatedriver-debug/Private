import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Contactos",
  description: "Fale com a equipa FC Private Driver.",
};

export default function ContactPage() {
  return (
    <div className="pt-20">
      <section className="border-b border-[var(--border)] bg-[var(--ink)] py-20 text-white">
        <Container className="max-w-3xl">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/45">
            Contactos
          </p>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-5xl tracking-tight sm:text-6xl">
            Estamos disponíveis para ajudar
          </h1>
          <p className="mt-4 text-white/70">
            Para suporte a clientes, motoristas ou parcerias, contacte-nos
            diretamente.
          </p>
        </Container>
      </section>
      <section className="py-16">
        <Container>
          <div className="max-w-xl rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--muted)]">
              Email
            </p>
            <a
              href={`mailto:${siteConfig.supportEmail}`}
              className="mt-2 block font-[family-name:var(--font-display)] text-3xl text-[var(--foreground)] hover:text-[var(--accent-hover)]"
            >
              {siteConfig.supportEmail}
            </a>
          </div>
        </Container>
      </section>
    </div>
  );
}
