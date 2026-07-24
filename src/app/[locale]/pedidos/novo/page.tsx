"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { createTripAction } from "@/actions/marketplace";
import { AddressAutocompleteInput } from "@/components/map/AddressAutocompleteInput";
import { TripRouteMap } from "@/components/map/TripRouteMap";
import {
  TripPlannerSection,
  type TripPlannerValues,
} from "@/components/trip/TripPlannerSection";
import { useLocale, useTranslations } from "next-intl";
import { formatDistance, formatDuration } from "@/lib/maps/route";

type VehicleClassOption = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
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
  provider?: string;
};

function BookingIcon({ name }: { name: "route" | "schedule" | "party" | "details" }) {
  const common = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (name === "route") {
    return (
      <svg {...common}>
        <circle cx="6" cy="6" r="2.5" />
        <circle cx="18" cy="18" r="2.5" />
        <path d="M8.5 7.5c4 0 5 9 9 9" />
      </svg>
    );
  }
  if (name === "schedule") {
    return (
      <svg {...common}>
        <rect x="3.5" y="5" width="17" height="15" rx="2" />
        <path d="M8 3.5v3M16 3.5v3M3.5 10h17" />
      </svg>
    );
  }
  if (name === "party") {
    return (
      <svg {...common}>
        <circle cx="9" cy="8" r="2.5" />
        <circle cx="16" cy="9" r="2" />
        <path d="M4.5 18c.6-2.4 2.6-4 5-4s4.4 1.6 5 4" />
        <path d="M13.5 18c.3-1.5 1.4-2.6 2.8-2.6 1.2 0 2.2.7 2.7 1.8" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M12 4.5v15M8 8.5h6.5a2.5 2.5 0 0 1 0 5H9" />
    </svg>
  );
}

function defaultPlannerValues(): TripPlannerValues {
  return {
    enabled: false,
    tripType: "CUSTOM",
    flightScope: "DOMESTIC",
    arrivalDate: "",
    arrivalTime: "",
    bufferMinutes: 10,
    bufferTouched: false,
  };
}

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
  const [selectedClassId, setSelectedClassId] = useState("");
  const [pickupAt, setPickupAt] = useState("");
  const [planner, setPlanner] = useState<TripPlannerValues>(defaultPlannerValues);

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

  const onRecommendedDepartureChange = useCallback((datetimeLocal: string | null) => {
    if (datetimeLocal) setPickupAt(datetimeLocal);
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("publish", "true");
    formData.set("pickupAt", pickupAt);
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
    <section className="booking-page fade-up">
      <div className="booking-hero" aria-hidden>
        <div className="booking-hero-glow" />
      </div>

      <div className="container booking-layout">
        <header className="booking-intro">
          <p className="booking-eyebrow">{t("eyebrow")}</p>
          <h1 className="page-title">{t("title")}</h1>
          <p className="page-lead">{t("lead")}</p>
        </header>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={onSubmit} className="booking-form">
          <section className="booking-section">
            <div className="booking-section-head">
              <span className="booking-section-icon">
                <BookingIcon name="route" />
              </span>
              <div>
                <h2>{t("routeSection")}</h2>
                <p>{t("routeHint")}</p>
              </div>
            </div>
            <div className="booking-section-body">
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
                <div className="booking-route-preview">
                  {estimating && <p className="muted">{t("estimating")}</p>}
                  {route && (
                    <>
                      <div className="summary-strip booking-route-metrics">
                        <div className="summary-item">
                          <div className="label-sm">{t("distance")}</div>
                          <strong>{formatDistance(route.distanceMeters)}</strong>
                        </div>
                        <div className="summary-item">
                          <div className="label-sm">{t("duration")}</div>
                          <strong>{formatDuration(route.durationSeconds)}</strong>
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
            </div>
          </section>

          <TripPlannerSection
            values={planner}
            onChange={setPlanner}
            route={
              route
                ? {
                    distanceMeters: route.distanceMeters,
                    durationSeconds: route.durationSeconds,
                  }
                : null
            }
            estimating={estimating}
            onRecommendedDepartureChange={onRecommendedDepartureChange}
          />

          <section className="booking-section">
            <div className="booking-section-head">
              <span className="booking-section-icon">
                <BookingIcon name="schedule" />
              </span>
              <div>
                <h2>{t("scheduleSection")}</h2>
                <p>
                  {planner.enabled ? t("scheduleHintPlanner") : t("scheduleHint")}
                </p>
              </div>
            </div>
            <div className="booking-section-body">
              <div className="field">
                <label className="label" htmlFor="pickupAt">
                  {planner.enabled ? t("whenDeparture") : t("when")}
                </label>
                <input
                  className="input"
                  id="pickupAt"
                  name="pickupAt"
                  type="datetime-local"
                  required
                  value={pickupAt}
                  onChange={(e) => setPickupAt(e.target.value)}
                />
                {planner.enabled && (
                  <p className="muted" style={{ fontSize: "0.85rem", margin: "0.4rem 0 0" }}>
                    {t("departureSynced")}
                  </p>
                )}
              </div>

              <fieldset className="booking-class-fieldset">
                <legend className="label">{t("vehicleClass")}</legend>
                <input type="hidden" name="preferredVehicleClassId" value={selectedClassId} />
                <div className="booking-class-grid">
                  <button
                    type="button"
                    className={`booking-class-card${selectedClassId === "" ? " is-selected" : ""}`}
                    onClick={() => setSelectedClassId("")}
                  >
                    <span className="booking-class-name">{t("noPreference")}</span>
                    <span className="booking-class-meta">Comfort · Premium · Van</span>
                  </button>
                  {classes.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className={`booking-class-card${selectedClassId === c.id ? " is-selected" : ""}`}
                      onClick={() => setSelectedClassId(c.id)}
                    >
                      <span className="booking-class-name">{c.name}</span>
                      <span className="booking-class-meta">
                        {c.description || `Até ${c.maxPassengers} · ${c.maxLuggage} bags`}
                      </span>
                      <span className="booking-class-capacity">≤ {c.maxPassengers} pax</span>
                    </button>
                  ))}
                </div>
              </fieldset>
            </div>
          </section>

          <section className="booking-section">
            <div className="booking-section-head">
              <span className="booking-section-icon">
                <BookingIcon name="party" />
              </span>
              <div>
                <h2>{t("partySection")}</h2>
                <p>{t("partyHint")}</p>
              </div>
            </div>
            <div className="booking-section-body">
              <div className="grid-2">
                <div className="field">
                  <label className="label" htmlFor="passengers">
                    {t("passengers")}
                  </label>
                  <input
                    className="input"
                    id="passengers"
                    name="passengers"
                    type="number"
                    min={1}
                    max={8}
                    defaultValue={1}
                    required
                  />
                </div>
                <div className="field">
                  <label className="label" htmlFor="luggage">
                    {t("luggage")}
                  </label>
                  <input
                    className="input"
                    id="luggage"
                    name="luggage"
                    type="number"
                    min={0}
                    defaultValue={1}
                    required
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="booking-section">
            <div className="booking-section-head">
              <span className="booking-section-icon">
                <BookingIcon name="details" />
              </span>
              <div>
                <h2>{t("detailsSection")}</h2>
                <p>{t("detailsHint")}</p>
              </div>
            </div>
            <div className="booking-section-body">
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
                <textarea
                  className="textarea"
                  id="notes"
                  name="notes"
                  placeholder={t("notesPlaceholder")}
                />
              </div>
            </div>
          </section>

          <div className="booking-submit">
            <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
              {loading ? t("submitting") : t("submit")}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
