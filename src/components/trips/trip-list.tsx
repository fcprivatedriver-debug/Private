import Link from "next/link";
import { TripStatusBadge } from "@/components/shared";
import type { TripSummary } from "@/types";
import { vehicleClassLabels } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";

interface TripListProps {
  trips: TripSummary[];
  detailBasePath: string;
}

export function TripList({ trips, detailBasePath }: TripListProps) {
  if (trips.length === 0) {
    return null;
  }

  return (
    <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
      {trips.map((trip) => (
        <li key={trip.id}>
          <Link
            href={`${detailBasePath}/${trip.id}`}
            className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-[var(--surface-hover)] sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0 space-y-1">
              <p className="truncate font-medium text-[var(--foreground)]">
                {trip.pickupLabel} → {trip.dropoffLabel}
              </p>
              <p className="text-sm text-[var(--muted)]">
                {formatDateTime(trip.pickupAt)} ·{" "}
                {vehicleClassLabels[trip.vehicleClass]} · {trip.proposalCount}{" "}
                proposta{trip.proposalCount === 1 ? "" : "s"}
              </p>
            </div>
            <TripStatusBadge status={trip.status} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
