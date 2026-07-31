"use client";

import { useState, useTransition } from "react";
import { driverTripAction } from "@/actions/trips";
import type { TripStatus } from "@prisma/client";

type TripRow = {
  id: string;
  status: TripStatus;
  pickupAddress: string;
  dropoffAddress: string;
  scheduledAt: string;
  customerName: string;
  estimatedMinutes: number | null;
};

export function DriverTripCard({ trip }: { trip: TripRow }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [showComplete, setShowComplete] = useState(false);
  const [tolls, setTolls] = useState("");
  const [parking, setParking] = useState("");
  const [notes, setNotes] = useState("");

  function run(
    action: Parameters<typeof driverTripAction>[1],
    extra?: { tollsCents?: number; parkingCents?: number; notes?: string },
  ) {
    startTransition(async () => {
      const res = await driverTripAction(trip.id, action, extra);
      setMessage(res.error || res.success || null);
    });
  }

  return (
    <div className="panel panel-lift" style={{ marginBottom: "1rem" }}>
      <strong>
        {trip.pickupAddress.split(",")[0]} → {trip.dropoffAddress.split(",")[0]}
      </strong>
      <p className="muted" style={{ margin: "0.35rem 0" }}>
        {trip.customerName} · {new Date(trip.scheduledAt).toLocaleString("pt-PT")}
      </p>
      {message && <div className="alert alert-success" style={{ marginTop: "0.5rem" }}>{message}</div>}

      <div className="cta-row" style={{ marginTop: "0.75rem", flexWrap: "wrap" }}>
        {trip.status === "DRIVER_ASSIGNED" && (
          <>
            <button type="button" className="btn btn-primary btn-sm" disabled={pending} onClick={() => run("accept")}>
              Aceitar
            </button>
            <button type="button" className="btn btn-danger btn-sm" disabled={pending} onClick={() => run("decline")}>
              Recusar
            </button>
          </>
        )}
        {["CONFIRMED", "DRIVER_ASSIGNED"].includes(trip.status) && (
          <button type="button" className="btn btn-secondary btn-sm" disabled={pending} onClick={() => run("en_route")}>
            A caminho
          </button>
        )}
        {trip.status === "DRIVER_EN_ROUTE" && (
          <button type="button" className="btn btn-secondary btn-sm" disabled={pending} onClick={() => run("arrived")}>
            Cheguei
          </button>
        )}
        {trip.status === "DRIVER_ARRIVED" && (
          <button type="button" className="btn btn-primary btn-sm" disabled={pending} onClick={() => run("start")}>
            Iniciar viagem
          </button>
        )}
        {trip.status === "IN_PROGRESS" && (
          <>
            <button type="button" className="btn btn-secondary btn-sm" disabled={pending} onClick={() => run("start_wait")}>
              Iniciar espera
            </button>
            <button type="button" className="btn btn-secondary btn-sm" disabled={pending} onClick={() => run("end_wait")}>
              Terminar espera
            </button>
            <button type="button" className="btn btn-primary btn-sm" disabled={pending} onClick={() => setShowComplete(true)}>
              Concluir
            </button>
          </>
        )}
      </div>

      {showComplete && (
        <div style={{ marginTop: "1rem", borderTop: "1px solid var(--line)", paddingTop: "1rem" }}>
          <div className="grid-2">
            <div className="field">
              <label className="label">Portagens (€)</label>
              <input className="input" value={tolls} onChange={(e) => setTolls(e.target.value)} placeholder="0.00" />
            </div>
            <div className="field">
              <label className="label">Estacionamento (€)</label>
              <input className="input" value={parking} onChange={(e) => setParking(e.target.value)} placeholder="0.00" />
            </div>
          </div>
          <div className="field">
            <label className="label">Notas</label>
            <textarea className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={pending}
            onClick={() =>
              run("complete", {
                tollsCents: tolls ? Math.round(parseFloat(tolls) * 100) : undefined,
                parkingCents: parking ? Math.round(parseFloat(parking) * 100) : undefined,
                notes: notes || undefined,
              })
            }
          >
            Confirmar conclusão
          </button>
        </div>
      )}
    </div>
  );
}
