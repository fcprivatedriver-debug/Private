import Link from "next/link";
import type { Service } from "@/data/services";

export function ServiceCard({ service }: { service: Service }) {
  return (
    <article className="service-card" style={{ ["--svc-accent" as string]: service.accent }}>
      <div className="service-card-mark" aria-hidden />
      <h3 className="service-card-title">{service.name}</h3>
      <p className="service-card-desc">{service.description}</p>
      <ul className="service-card-examples">
        {service.examples.slice(0, 5).map((ex) => (
          <li key={ex}>{ex}</li>
        ))}
      </ul>
      <Link href={`/contactos?servico=${service.id}`} className="btn btn-primary btn-sm service-card-cta">
        {service.cta || "Pedir este serviço"}
      </Link>
    </article>
  );
}
