"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { createTripAction } from "@/actions/trips";
import type { ActionState } from "@/actions/auth";
import { AddressAutocompleteInput } from "@/components/map/AddressAutocompleteInput";
import { TripRouteMap } from "@/components/map/TripRouteMap";
import { formatMinutes } from "@/lib/utils";

type Estimate = {
  distanceLabel: string;
  durationLabel: string;
  durationSeconds: number;
};

type TripActionState = ActionState & { tripId?: string };

const initial: TripActionState = {};

export function TripBookingForm({ minimumChargeMinutes }: { minimumChargeMinutes: number }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(createTripAction, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [pickupLat, setPickupLat] = useState<number | null>(null);
  const [pickupLng, setPickupLng] = useState<number | null>(null);
  const [dropoffLat, setDropoffLat] = useState<number | null>(null);
  const [dropoffLng, setDropoffLng] = useState<number | null>(null);
  const [needsWaiting, setNeedsWaiting] = useState(false);
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [waitMinutes, setWaitMinutes] = useState(30);

  useEffect(() => {
    if (!pickup || !dropoff || pickup.length < 3 || dropoff.length < 3) {
      setEstimate(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ pickup, dropoff });
        if (pickupLat) params.set("pickupLat", String(pickupLat));
        if (pickupLng) params.set("pickupLng", String(pickupLng));
        if (dropoffLat) params.set("dropoffLat", String(dropoffLat));
        if (dropoffLng) params.set("dropoffLng", String(dropoffLng));
        const res = await fetch(`/api/routes/estimate?${params}`);
        if (res.ok) setEstimate(await res.json());
      } catch {
        setEstimate(null);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [pickup, dropoff, pickupLat, pickupLng, dropoffLat, dropoffLng]);

  useEffect(() => {
    if (state.tripId) {
      router.push(`/cliente/viagens/${state.tripId}`);
    }
  }, [state.tripId, router]);

  const baseMinutes = estimate
    ? Math.max(minimumChargeMinutes, Math.ceil(estimate.durationSeconds / 60))
    : minimumChargeMinutes;
  const totalMinutes = baseMinutes + (needsWaiting ? waitMinutes : 0);

  function submitWithMode(mode: "request" | "schedule") {
    if (!showSummary) {
      setShowSummary(true);
      return;
    }
    if (!formRef.current) return;
    const fd = new FormData(formRef.current);
    fd.set("mode", mode);
    formAction(fd);
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="panel panel-lift"
      onSubmit={(e) => {
        if (!showSummary) {
          e.preventDefault();
          setShowSummary(true);
        }
      }}
    >
      {state.error && <div className="alert alert-error">{state.error}</div>}
      {state.success && <div className="alert alert-success">{state.success}</div>}

      <div className="field">
        <label className="label" htmlFor="pickupAddress">
          Origem
        </label>
        <AddressAutocompleteInput
          id="pickupAddress"
          name="pickupAddress"
          value={pickup}
          placeholder="Morada de recolha"
          required
          onChange={(v, place) => {
            setPickup(v);
            setPickupLat(place?.lat ?? null);
            setPickupLng(place?.lng ?? null);
          }}
        />
        <input type="hidden" name="pickupLat" value={pickupLat ?? ""} />
        <input type="hidden" name="pickupLng" value={pickupLng ?? ""} />
      </div>

      <div className="field">
        <label className="label" htmlFor="dropoffAddress">
          Destino
        </label>
        <AddressAutocompleteInput
          id="dropoffAddress"
          name="dropoffAddress"
          value={dropoff}
          placeholder="Morada de destino"
          required
          onChange={(v, place) => {
            setDropoff(v);
            setDropoffLat(place?.lat ?? null);
            setDropoffLng(place?.lng ?? null);
          }}
        />
        <input type="hidden" name="dropoffLat" value={dropoffLat ?? ""} />
        <input type="hidden" name="dropoffLng" value={dropoffLng ?? ""} />
      </div>

      <TripRouteMap origin={pickup} destination={dropoff} className="map-embed" />

      <div className="grid-2" style={{ marginTop: "1rem" }}>
        <div className="field">
          <label className="label" htmlFor="date">
            Data
          </label>
          <input className="input" type="date" id="date" name="date" required min={today} />
        </div>
        <div className="field">
          <label className="label" htmlFor="time">
            Hora
          </label>
          <input className="input" type="time" id="time" name="time" required />
        </div>
      </div>

      <div className="grid-2">
        <div className="field">
          <label className="label" htmlFor="passengers">
            Passageiros
          </label>
          <input className="input" type="number" id="passengers" name="passengers" min={1} max={8} defaultValue={1} />
        </div>
        <div className="field">
          <label className="label" htmlFor="luggage">
            Bagagem (peças)
          </label>
          <input className="input" type="number" id="luggage" name="luggage" min={0} max={10} defaultValue={0} />
        </div>
      </div>

      <div className="field">
        <label className="label">Tipo de viagem</label>
        <div className="cta-row">
          <label className="quality-pill">
            <input type="radio" name="tripType" value="ONE_WAY" defaultChecked /> Só ida
          </label>
          <label className="quality-pill">
            <input type="radio" name="tripType" value="ROUND_TRIP" /> Ida e volta
          </label>
        </div>
      </div>

      <div className="field">
        <label className="quality-pill">
          <input
            type="checkbox"
            name="needsWaiting"
            checked={needsWaiting}
            onChange={(e) => setNeedsWaiting(e.target.checked)}
          />{" "}
          Preciso de tempo de espera no destino
        </label>
        {needsWaiting && (
          <div style={{ marginTop: "0.5rem" }}>
            <label className="label" htmlFor="estimatedWaitMinutes">
              Duração estimada da espera (min)
            </label>
            <input
              className="input"
              type="number"
              id="estimatedWaitMinutes"
              name="estimatedWaitMinutes"
              min={15}
              max={240}
              value={waitMinutes}
              onChange={(e) => setWaitMinutes(Number(e.target.value))}
            />
          </div>
        )}
      </div>

      <div className="field">
        <label className="label" htmlFor="passengerContact">
          Contacto do passageiro
        </label>
        <input className="input" id="passengerContact" name="passengerContact" placeholder="+351 …" />
      </div>

      <div className="field">
        <label className="label" htmlFor="notes">
          Notas
        </label>
        <textarea className="textarea" id="notes" name="notes" placeholder="Instruções especiais, referências…" />
      </div>

      {estimate && (
        <div className="estimate-summary">
          <strong>Estimativa do trajeto</strong>
          <p className="muted" style={{ margin: "0.35rem 0 0" }}>
            {estimate.distanceLabel} · {estimate.durationLabel}
            {needsWaiting && ` · + ${waitMinutes} min de espera`}
          </p>
          <p style={{ margin: "0.5rem 0 0", fontWeight: 600 }}>
            Minutos estimados: {formatMinutes(totalMinutes)}
          </p>
        </div>
      )}

      {showSummary && (
        <div className="alert-banner alert-banner-info">
          Confirme os dados acima. A viagem ficará «A aguardar confirmação» até validação da FC Private Driver.
        </div>
      )}

      <div className="form-actions">
        <button type="button" className="btn btn-primary" disabled={pending} onClick={() => submitWithMode("request")}>
          {pending ? "A enviar…" : showSummary ? "Confirmar — Pedir viagem" : "Pedir viagem"}
        </button>
        <button type="button" className="btn btn-secondary" disabled={pending} onClick={() => submitWithMode("schedule")}>
          {showSummary ? "Confirmar — Agendar viagem" : "Agendar viagem"}
        </button>
        {showSummary && (
          <button type="button" className="btn btn-ghost" onClick={() => setShowSummary(false)}>
            Voltar a editar
          </button>
        )}
      </div>
    </form>
  );
}
