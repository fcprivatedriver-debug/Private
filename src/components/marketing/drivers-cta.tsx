import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

export function DriversCtaSection() {
  return (
    <section className="bg-[var(--ink)] py-20 text-white sm:py-28">
      <Container className="grid items-center gap-10 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/45">
            Para motoristas
          </p>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-4xl tracking-tight sm:text-5xl">
            Proponha o seu preço. Construa a sua reputação.
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/65 sm:text-base">
            Gere veículos, responda a pedidos abertos e acompanhe ganhos e
            comissões num painel pensado para profissionais.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 lg:justify-end">
          <Link href="/registo">
            <Button size="lg">Registar como motorista</Button>
          </Link>
          <Link href="/para-motoristas">
            <Button
              size="lg"
              variant="outline"
              className="border-white/30 bg-transparent text-white hover:bg-white/10"
            >
              Saber mais
            </Button>
          </Link>
        </div>
      </Container>
    </section>
  );
}
