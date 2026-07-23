import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { siteConfig } from "@/config/site";

export function MarketingHero() {
  return (
    <section className="relative min-h-[100svh] overflow-hidden bg-[var(--ink)] text-white">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(120deg, rgba(10,22,40,0.88) 0%, rgba(10,22,40,0.55) 45%, rgba(10,22,40,0.75) 100%), url('https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=2400&q=80')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at 70% 30%, rgba(212,175,122,0.35), transparent 40%)",
        }}
      />

      <Container className="relative flex min-h-[100svh] flex-col justify-end pb-20 pt-28 sm:pb-24">
        <div className="max-w-3xl animate-[fade-up_0.9s_ease_both]">
          <p className="mb-5 font-[family-name:var(--font-display)] text-5xl leading-none tracking-tight sm:text-7xl md:text-8xl">
            {siteConfig.name}
          </p>
          <h1 className="max-w-2xl text-xl font-normal leading-relaxed text-white/85 sm:text-2xl">
            Motoristas privados sob pedido. Compare propostas e escolha a
            viagem certa.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/60 sm:text-base">
            Uma plataforma profissional para clientes exigentes e motoristas
            verificados — transparente do pedido à avaliação.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/registo">
              <Button size="lg">Começar agora</Button>
            </Link>
            <Link href="/como-funciona">
              <Button
                size="lg"
                variant="outline"
                className="border-white/30 bg-transparent text-white hover:bg-white/10"
              >
                Como funciona
              </Button>
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}
