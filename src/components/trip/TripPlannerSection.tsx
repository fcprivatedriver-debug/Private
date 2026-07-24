"use client";

import { useEffect, useMemo, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  AIRPORT_BUFFER_DOMESTIC_MIN,
  AIRPORT_BUFFER_INTERNATIONAL_MIN,
  calculateTripPlan,
  defaultBufferMinutes,
  formatPlanTime,
  parseDatetimeLocal,
  toDatetimeLocalValue,
  type FlightScope,
  type PlannerTripType,
} from "@/lib/maps/trip-planner";
import { formatDistance, formatDuration } from "@/lib/maps/route";

export type TripPlannerValues = {
  enabled: boolean;
  tripType: PlannerTripType;
  flightScope: FlightScope;
  arrivalDate: string;
  arrivalTime: string;
  bufferMinutes: number;
  bufferTouched: boolean;
};

type RouteSnapshot = {
  distanceMeters: number;
  durationSeconds: number;
} | null;

type Props = {
  values: TripPlannerValues;
  onChange: (next: TripPlannerValues) => void;
  route: RouteSnapshot;
  estimating: boolean;
  /** Called whenever the recommended departure changes so the form can sync pickupAt. */
  onRecommendedDepartureChange: (datetimeLocal: string | null) => void;
};

const TYPE_OPTIONS: PlannerTripType[] = [
  "AIRPORT",
  "MEETING",
  "EVENT",
  "HOTEL",
  "CUSTOM",
];

export function TripPlannerSection({
  values,
  onChange,
  route,
  estimating,
  onRecommendedDepartureChange,
}: Props) {
  const t = useTranslations("tripPlanner");
  const locale = useLocale();
  const intlLocale = locale.startsWith("pt") ? "pt-PT" : "en-GB";
  const lastSyncedDeparture = useRef<string | null>(null);

  const desiredArrivalAt = useMemo(() => {
    if (!values.arrivalDate || !values.arrivalTime) return null;
    return parseDatetimeLocal(`${values.arrivalDate}T${values.arrivalTime}`);
  }, [values.arrivalDate, values.arrivalTime]);

  const plan = useMemo(() => {
    if (!values.enabled || !desiredArrivalAt || !route) return null;
    return calculateTripPlan({
      desiredArrivalAt,
      durationSeconds: route.durationSeconds,
      safetyBufferMinutes: values.bufferMinutes,
    });
  }, [values.enabled, values.bufferMinutes, desiredArrivalAt, route]);

  useEffect(() => {
    if (!values.enabled || !plan) {
      if (lastSyncedDeparture.current !== null) {
        lastSyncedDeparture.current = null;
        onRecommendedDepartureChange(null);
      }
      return;
    }
    const next = toDatetimeLocalValue(plan.recommendedDepartureAt);
    if (lastSyncedDeparture.current !== next) {
      lastSyncedDeparture.current = next;
      onRecommendedDepartureChange(next);
    }
  }, [values.enabled, plan, onRecommendedDepartureChange]);

  function patch(partial: Partial<TripPlannerValues>) {
    onChange({ ...values, ...partial });
  }

  function setTripType(tripType: PlannerTripType) {
    const next: TripPlannerValues = {
      ...values,
      tripType,
      bufferTouched: false,
      bufferMinutes: defaultBufferMinutes(
        tripType,
        tripType === "AIRPORT" ? values.flightScope : null,
      ),
    };
    onChange(next);
  }

  function setFlightScope(flightScope: FlightScope) {
    const next: TripPlannerValues = {
      ...values,
      flightScope,
      bufferMinutes: values.bufferTouched
        ? values.bufferMinutes
        : defaultBufferMinutes("AIRPORT", flightScope),
    };
    onChange(next);
  }

  return (
    <section className="booking-section booking-planner">
      <div className="booking-section-head">
        <span className="booking-section-icon" aria-hidden>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
            <circle cx="12" cy="12" r="8.5" />
            <path d="M12 7.5v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <div style={{ flex: 1 }}>
          <div className="booking-planner-toggle-row">
            <div>
              <h2>{t("title")}</h2>
              <p>{t("lead")}</p>
            </div>
            <label className="booking-planner-switch">
              <input
                type="checkbox"
                checked={values.enabled}
                onChange={(e) => patch({ enabled: e.target.checked })}
              />
              <span>{values.enabled ? t("enabled") : t("enable")}</span>
            </label>
          </div>
        </div>
      </div>

      {values.enabled && (
        <div className="booking-section-body">
          <input type="hidden" name="plannerEnabled" value="true" />
          <input type="hidden" name="plannerTripType" value={values.tripType} />
          <input type="hidden" name="safetyBufferMinutes" value={String(values.bufferMinutes)} />
          {desiredArrivalAt && (
            <input
              type="hidden"
              name="desiredArrivalAt"
              value={desiredArrivalAt.toISOString()}
            />
          )}
          {values.tripType === "AIRPORT" && (
            <input type="hidden" name="flightScope" value={values.flightScope} />
          )}

          <div className="field">
            <span className="label">{t("tripType")}</span>
            <div className="booking-planner-types" role="radiogroup" aria-label={t("tripType")}>
              {TYPE_OPTIONS.map((type) => (
                <button
                  key={type}
                  type="button"
                  className={`booking-planner-type${values.tripType === type ? " is-selected" : ""}`}
                  onClick={() => setTripType(type)}
                  aria-pressed={values.tripType === type}
                >
                  {t(`types.${type}`)}
                </button>
              ))}
            </div>
          </div>

          {values.tripType === "AIRPORT" && (
            <div className="field">
              <span className="label">{t("flightScope")}</span>
              <div className="booking-planner-types" role="radiogroup">
                <button
                  type="button"
                  className={`booking-planner-type${values.flightScope === "DOMESTIC" ? " is-selected" : ""}`}
                  onClick={() => setFlightScope("DOMESTIC")}
                  aria-pressed={values.flightScope === "DOMESTIC"}
                >
                  {t("domestic")}
                  <span className="booking-planner-type-hint">
                    {AIRPORT_BUFFER_DOMESTIC_MIN / 60}h
                  </span>
                </button>
                <button
                  type="button"
                  className={`booking-planner-type${values.flightScope === "INTERNATIONAL" ? " is-selected" : ""}`}
                  onClick={() => setFlightScope("INTERNATIONAL")}
                  aria-pressed={values.flightScope === "INTERNATIONAL"}
                >
                  {t("international")}
                  <span className="booking-planner-type-hint">
                    {AIRPORT_BUFFER_INTERNATIONAL_MIN / 60}h
                  </span>
                </button>
              </div>
              <p className="muted" style={{ fontSize: "0.85rem", margin: "0.45rem 0 0" }}>
                {t("airportHint")}
              </p>
            </div>
          )}

          <div className="grid-2">
            <div className="field">
              <label className="label" htmlFor="plannerArrivalDate">
                {t("arrivalDate")}
              </label>
              <input
                className="input"
                id="plannerArrivalDate"
                type="date"
                required={values.enabled}
                value={values.arrivalDate}
                onChange={(e) => patch({ arrivalDate: e.target.value })}
              />
            </div>
            <div className="field">
              <label className="label" htmlFor="plannerArrivalTime">
                {t("arrivalTime")}
              </label>
              <input
                className="input"
                id="plannerArrivalTime"
                type="time"
                required={values.enabled}
                value={values.arrivalTime}
                onChange={(e) => patch({ arrivalTime: e.target.value })}
              />
            </div>
          </div>

          <div className="field">
            <label className="label" htmlFor="safetyBufferMinutes">
              {t("buffer")}
            </label>
            <div className="booking-planner-buffer">
              <input
                className="input"
                id="safetyBufferMinutesVisible"
                type="number"
                min={0}
                max={360}
                step={5}
                value={values.bufferMinutes}
                onChange={(e) =>
                  patch({
                    bufferMinutes: Math.max(0, Number(e.target.value) || 0),
                    bufferTouched: true,
                  })
                }
              />
              <span className="muted">{t("bufferUnit")}</span>
              {values.tripType === "AIRPORT" && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() =>
                    patch({
                      bufferMinutes: defaultBufferMinutes("AIRPORT", values.flightScope),
                      bufferTouched: false,
                    })
                  }
                >
                  {t("resetBuffer")}
                </button>
              )}
            </div>
          </div>

          <div className="booking-planner-results">
            {estimating && <p className="muted">{t("calculating")}</p>}
            {!estimating && !route && (
              <p className="muted">{t("needRoute")}</p>
            )}
            {!estimating && route && !desiredArrivalAt && (
              <p className="muted">{t("needArrival")}</p>
            )}
            {plan && route && (
              <div className="summary-strip booking-route-metrics">
                <div className="summary-item">
                  <div className="label-sm">{t("distance")}</div>
                  <strong>{formatDistance(route.distanceMeters)}</strong>
                </div>
                <div className="summary-item">
                  <div className="label-sm">{t("travelTime")}</div>
                  <strong>{formatDuration(route.durationSeconds)}</strong>
                </div>
                <div className="summary-item">
                  <div className="label-sm">{t("recommendedDeparture")}</div>
                  <strong>{formatPlanTime(plan.recommendedDepartureAt, intlLocale)}</strong>
                </div>
                <div className="summary-item">
                  <div className="label-sm">{t("expectedArrival")}</div>
                  <strong>{formatPlanTime(plan.expectedArrivalAt, intlLocale)}</strong>
                </div>
              </div>
            )}
            {plan && (
              <p className="booking-planner-footnote">
                {t("syncNote", {
                  buffer: String(plan.bufferMinutes),
                  travel: String(plan.travelMinutes),
                })}
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
