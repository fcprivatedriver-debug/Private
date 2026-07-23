import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

export const metadata: Metadata = {
  title: "Para motoristas",
  description:
    "Registe-se como motorista privado, gere veículos e envie propostas a pedidos abertos.",
};

const benefits = [
  "Acesso a pedidos abertos na sua zona e classe de veículo",
  "Controlo total do preço das suas propostas",
  "Gestão de frota e disponibilidade no painel",
  "Histórico de ganhos e comissões da plataforma",
];

export default function ForDriversPage() {
  return (
    <div className="pt-20">
      <section className="bg-[var(--ink)] py-24 text-white">
        <Container className="max-w-3xl">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/45">
            Motoristas
          </p>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-5xl tracking-tight sm:text-6xl">
            Construa o seu negócio de transfers privados
          </h1>
          <p className="mt-4 max-w-2xl text-white/70">
            A FC Private Driver dá-lhe ferramentas profissionais para propor,
            executar e crescer — com reputação visível e pagamentos preparados
            para integração.
          </p>
          <Link href="/registo" className="mt-8 inline-flex">
            <Button size="lg">Criar conta de motorista</Button>
          </Link>
        </Container>
      </section>
      <section className="py-20">
        <Container>
          <ul className="grid gap-6 md:grid-cols-2">
            {benefits.map((benefit) => (
              <li
                key={benefit}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 text-[var(--foreground)]"
              >
                {benefit}
              </li>
            ))}
          </ul>
        </Container>
      </section>
    </div>
  );
}
