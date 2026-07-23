"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { createTripAction } from "@/actions/marketplace";
import { AddressAutocompleteInput } from "@/components/map/AddressAutocompleteInput";
import { TripRouteMap } from "@/components/map/TripRouteMap";
import { useLocale, useTranslations } from "next-intl";
import { formatDistance, formatDuration } from "@/lib/maps/route";

type VehicleClassOption = {
  id: string;
  code: string;
  name: string;
  maxPassengers: number;
  maxLuggage: number;
};

type RouteInfo = {
  distanceMeters: number;
  durationSeconds: number;
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;
  distanceLabel: string;
  durationLabel: string;
};

export default function NewTripPage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("tripForm");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState<VehicleClassOption[]>([]);
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [route, setRoute] = useState<RouteInfo | null>(null);
  const [estimating, setEstimating] = useState(false);

  useEffect(() => {
    fetch(`/api/vehicle-classes?locale=${locale}`)
      .then((r) => r.json())
      .then((data) => setClasses(data.classes || []))
      .catch(() => setClasses([]));
  }, [locale]);

  useEffect(() => {
    if (pickup.trim().length < 5 || dropoff.trim().length < 5) {
      setRoute(null);
      return;
    }
    const handle = setTimeout(async () => {
      setEstimating(true);
      try {
        const qs = new URLSearchParams({ pickup, dropoff });
        const res = await fetch(`/api/routes/estimate?${qs}`);
        const data = await res.json();
        if (res.ok) setRoute(data);
        else setRoute(null);
      } catch {
        setRoute(null);
      } finally {
        setEstimating(false);
      }
    }, 650);
    return () => clearTimeout(handle);
  }, [pickup, dropoff]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("publish", "true");
    const preferred = String(formData.get("preferredVehicleClassId") || "");
    if (!preferred) formData.delete("preferredVehicleClassId");
    if (route) {
      formData.set("pickupLat", String(route.pickupLat));
      formData.set("pickupLng", String(route.pickupLng));
      formData.set("dropoffLat", String(route.dropoffLat));
      formData.set("dropoffLng", String(route.dropoffLng));
      formData.set("distanceMeters", String(route.distanceMeters));
      formData.set("durationSeconds", String(route.durationSeconds));
    }
    const result = await createTripAction(formData);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push(`/pedidos/${result.tripId}`);
    router.refresh();
  }

  return (
    <section className="section fade-up">
      <div className="container" style={{ maxWidth: 760 }}>
        <h1 className="page-title">{t("title")}</h1>
        <p className="page-lead">{t("lead")}</p>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={onSubmit} className="panel panel-lift">
          <AddressAutocompleteInput
            name="pickupAddress"
            label={t("pickup")}
            placeholder={t("pickupPlaceholder")}
            required
            onChangeValue={setPickup}
          />
          <AddressAutocompleteInput
            name="dropoffAddress"
            label={t("dropoff")}
            placeholder={t("dropoffPlaceholder")}
            required
            onChangeValue={setDropoff}
          />

          {(route || estimating) && (
            <div style={{ marginBottom: "1.25rem" }}>
              {estimating && <p className="muted">A calcular o trajeto…</p>}
              {route && (
                <>
                  <div className="summary-strip" style={{ marginBottom: "0.85rem" }}>
                    <div className="summary-item">
                      <div className="label-sm">Distância</div>
                      <strong>{formatDistance(route.distanceMeters)}</strong>
                    </div>
                    <div className="summary-item">
                      <div className="label-sm">Duração estimada</div>
                      <strong>{formatDuration(route.durationSeconds)}</strong>
                    </div>
                    <div className="summary-item">
                      <div className="label-sm">Mapa</div>
                      <strong>Google Maps</strong>
                    </div>
                  </div>
                  <TripRouteMap
                    pickupAddress={pickup}
                    dropoffAddress={dropoff}
                    pickupLat={route.pickupLat}
                    pickupLng={route.pickupLng}
                    dropoffLat={route.dropoffLat}
                    dropoffLng={route.dropoffLng}
                  />
                </>
              )}
            </div>
          )}

          <div className="grid-2">
            <div className="field">
              <label className="label" htmlFor="pickupAt">
                {t("when")}
              </label>
              <input className="input" id="pickupAt" name="pickupAt" type="datetime-local" required />
            </div>
            <div className="field">
              <label className="label" htmlFor="preferredVehicleClassId">
                {t("vehicleClass")}
              </label>
              <select className="select" id="preferredVehicleClassId" name="preferredVehicleClassId" defaultValue="">
                <option value="">{t("noPreference")}</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · até {c.maxPassengers} / {c.maxLuggage}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid-2">
            <div className="field">
              <label className="label" htmlFor="passengers">
                {t("passengers")}
              </label>
              <input className="input" id="passengers" name="passengers" type="number" min={1} defaultValue={1} required />
            </div>
            <div className="field">
              <label className="label" htmlFor="luggage">
                {t("luggage")}
              </label>
              <input className="input" id="luggage" name="luggage" type="number" min={0} defaultValue={1} required />
            </div>
          </div>
          <div className="field">
            <label className="label" htmlFor="flightNumber">
              {t("flight")}
            </label>
            <input className="input" id="flightNumber" name="flightNumber" />
          </div>
          <div className="field">
            <label className="label" htmlFor="notes">
              {t("notes")}
            </label>
            <textarea className="textarea" id="notes" name="notes" placeholder={t("notesPlaceholder")} />
          </div>
          <div className="form-actions">
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? t("submitting") : t("submit")}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
