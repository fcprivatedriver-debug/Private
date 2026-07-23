import { Container } from "@/components/ui/container";

const steps = [
  {
    step: "01",
    title: "Crie o pedido",
    description:
      "Indique origem, destino, horário e classe de veículo. O pedido fica aberto a propostas.",
  },
  {
    step: "02",
    title: "Receba propostas",
    description:
      "Motoristas verificados enviam preços e condições. Compare com transparência total.",
  },
  {
    step: "03",
    title: "Escolha e viaje",
    description:
      "Aceite a melhor proposta, acompanhe a viagem e avalie o serviço no final.",
  },
];

export function HowItWorksSection() {
  return (
    <section className="border-b border-[var(--border)] bg-[var(--background)] py-20 sm:py-28">
      <Container>
        <div className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--muted)]">
            Processo
          </p>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-4xl tracking-tight sm:text-5xl">
            Do pedido à chegada, sem fricção.
          </h2>
          <p className="mt-4 text-[var(--muted)]">
            Um fluxo claro para clientes e motoristas — desenhado para confiança
            e controlo em cada etapa.
          </p>
        </div>
        <ol className="mt-14 grid gap-10 md:grid-cols-3">
          {steps.map((item) => (
            <li key={item.step} className="space-y-3">
              <span className="font-[family-name:var(--font-display)] text-4xl text-[var(--accent)]">
                {item.step}
              </span>
              <h3 className="text-xl font-medium">{item.title}</h3>
              <p className="text-sm leading-relaxed text-[var(--muted)]">
                {item.description}
              </p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
