import type { Metadata } from "next";
import Link from "next/link";
import { BRAND } from "@/config/brand";
import { FLEET, FLEET_INTRO } from "@/data/fleet";
import { FleetVehicle } from "@/components/site/FleetVehicle";

export const metadata: Metadata = {
  title: "Frota",
  description:
    "Frota FC Private Driver — Tesla Model 3 2024 Branco, Tesla Model 3 2025 Preto e Tesla Model Y 2026 Preto.",
};

export default function FrotaPage() {
  return (
    <section className="section fade-up">
      <div className="container">
        <div className="section-head">
          <span className="section-eyebrow">Frota</span>
          <h1 className="section-title">Veículos da FC Private Driver</h1>
          <p className="section-lead">{FLEET_INTRO}</p>
        </div>

        <div className="fleet-grid">
          {FLEET.map((vehicle) => (
            <FleetVehicle key={vehicle.id} vehicle={vehicle} />
          ))}
        </div>

        <div className="fleet-cta">
          <p className="muted">
            Serviço personalizado. Orçamento personalizado. Contacte-nos para receber uma proposta
            adaptada ao serviço que pretende.
          </p>
          <div className="hero-actions" style={{ marginTop: "1rem" }}>
            <a
              href={BRAND.whatsappUrl}
              className="btn btn-whatsapp"
              target="_blank"
              rel="noopener noreferrer"
            >
              Falar no WhatsApp
            </a>
            <Link href="/contactos" className="btn btn-primary">
              Pedir serviço
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
