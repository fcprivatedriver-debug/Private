import { VehicleStatusBadge } from "@/components/shared";
import type { Vehicle } from "@/types";
import { vehicleClassLabels } from "@/lib/constants";

interface VehicleCardProps {
  vehicle: Vehicle;
}

export function VehicleCard({ vehicle }: VehicleCardProps) {
  return (
    <article className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-medium">
            {vehicle.make} {vehicle.model}
          </h3>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {vehicle.year} · {vehicle.color} · {vehicle.plateNumber}
          </p>
        </div>
        <VehicleStatusBadge status={vehicle.status} />
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-[var(--muted)]">Classe</dt>
          <dd>{vehicleClassLabels[vehicle.vehicleClass]}</dd>
        </div>
        <div>
          <dt className="text-[var(--muted)]">Capacidade</dt>
          <dd>
            {vehicle.seats} lugares · {vehicle.luggageCapacity} bagagens
          </dd>
        </div>
      </dl>
    </article>
  );
}
