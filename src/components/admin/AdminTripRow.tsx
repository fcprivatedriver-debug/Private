"use client";

import { useState, useTransition } from "react";
import { confirmTripAdminAction } from "@/actions/trips";
import { refuseTripAdminAction } from "@/actions/trips-admin";
import type { TripStatus } from "@prisma/client";
import { TRIP_STATUS_LABELS } from "@/config/constants";

type Trip = {
  id: string;
  status: TripStatus;
  pickupAddress: string;
  dropoffAddress: string;
  scheduledAt: string;
  customerName: string;
  estimatedMinutes: number | null;
};

type Driver = { id: string; name: string };

export function AdminTripRow({ trip, drivers }: { trip: Trip; drivers: Driver[] }) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [driverId, setDriverId] = useState(drivers[0]?.id || "");

  function act(fn: () => Promise<{ error?: string; success?: string }>) {
    startTransition(async () => {
      const res = await fn();
      setMsg(res.error || res.success || null);
    });
  }

  return (
    <div className="list-item panel" style={{ cursor: "default" }}>
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
        <div>
          <strong>
            {trip.pickupAddress.split(",")[0]} → {trip.dropoffAddress.split(",")[0]}
          </strong>
          <div className="muted">
            {trip.customerName} · {new Date(trip.scheduledAt).toLocaleString("pt-PT")}
            {trip.estimatedMinutes ? ` · ~${trip.estimatedMinutes} min` : ""}
          </div>
        </div>
        <span className="badge">{TRIP_STATUS_LABELS[trip.status]}</span>
      </div>

      {msg && <div className="alert alert-success" style={{ marginTop: "0.5rem" }}>{msg}</div>}

      {trip.status === "AWAITING_CONFIRMATION" && (
        <div className="cta-row" style={{ marginTop: "0.75rem", flexWrap: "wrap" }}>
          <select className="select" value={driverId} onChange={(e) => setDriverId(e.target.value)} style={{ maxWidth: 200 }}>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={pending || !driverId}
            onClick={() => act(() => confirmTripAdminAction(trip.id, driverId))}
          >
            Confirmar e atribuir
          </button>
          <button
            type="button"
            className="btn btn-danger btn-sm"
            disabled={pending}
            onClick={() => act(() => refuseTripAdminAction(trip.id))}
          >
            Recusar
          </button>
        </div>
      )}
    </div>
  );
}
