import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { HowItWorksSection } from "@/components/marketing";

export const metadata: Metadata = {
  title: "Como funciona",
  description:
    "Peça uma viagem, compare propostas de motoristas privados e escolha a melhor opção.",
};

export default function HowItWorksPage() {
  return (
    <div className="pt-20">
      <section className="border-b border-[var(--border)] bg-[var(--ink)] py-20 text-white">
        <Container className="max-w-3xl">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/45">
            Guia
          </p>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-5xl tracking-tight sm:text-6xl">
            Como funciona a FC Private Driver
          </h1>
          <p className="mt-4 text-white/70">
            Um marketplace transparente: o cliente publica o pedido, os
            motoristas propõem, e a escolha fica nas suas mãos.
          </p>
        </Container>
      </section>
      <HowItWorksSection />
    </div>
  );
}
