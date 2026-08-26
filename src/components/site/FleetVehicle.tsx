import Image from "next/image";
import type { FleetVehicle } from "@/data/fleet";

export function FleetVehicle({ vehicle }: { vehicle: FleetVehicle }) {
  return (
    <article className="fleet-item fade-up">
      <div className="fleet-item-media">
        <Image
          src={vehicle.image}
          alt={vehicle.alt}
          width={1600}
          height={900}
          sizes="(max-width: 720px) 100vw, 33vw"
          className="fleet-item-image"
        />
      </div>
      <div className="fleet-item-body">
        <h3 className="fleet-item-title">{vehicle.model}</h3>
        <p className="fleet-item-meta">
          {vehicle.year} · {vehicle.colorLabel}
        </p>
      </div>
    </article>
  );
}
