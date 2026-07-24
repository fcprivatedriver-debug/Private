/** Pure trip-planner timing helpers (no I/O). */

export const PLANNER_TRIP_TYPES = [
  "AIRPORT",
  "MEETING",
  "EVENT",
  "HOTEL",
  "CUSTOM",
] as const;

export type PlannerTripType = (typeof PLANNER_TRIP_TYPES)[number];

export const FLIGHT_SCOPES = ["DOMESTIC", "INTERNATIONAL"] as const;
export type FlightScope = (typeof FLIGHT_SCOPES)[number];

/** Recommended airport check-in buffers (minutes). */
export const AIRPORT_BUFFER_DOMESTIC_MIN = 120;
export const AIRPORT_BUFFER_INTERNATIONAL_MIN = 180;

export const DEFAULT_BUFFERS: Record<PlannerTripType, number> = {
  AIRPORT: AIRPORT_BUFFER_DOMESTIC_MIN,
  MEETING: 15,
  EVENT: 20,
  HOTEL: 10,
  CUSTOM: 10,
};

export function defaultBufferMinutes(
  tripType: PlannerTripType,
  flightScope?: FlightScope | null,
): number {
  if (tripType === "AIRPORT") {
    return flightScope === "INTERNATIONAL"
      ? AIRPORT_BUFFER_INTERNATIONAL_MIN
      : AIRPORT_BUFFER_DOMESTIC_MIN;
  }
  return DEFAULT_BUFFERS[tripType];
}

export type TripPlanInput = {
  desiredArrivalAt: Date;
  durationSeconds: number;
  safetyBufferMinutes: number;
};

export type TripPlanResult = {
  travelMinutes: number;
  bufferMinutes: number;
  recommendedDepartureAt: Date;
  expectedArrivalAt: Date;
};

/**
 * recommendedDeparture = desiredArrival − travel − buffer
 * expectedArrival = recommendedDeparture + travel (= desiredArrival − buffer)
 */
export function calculateTripPlan(input: TripPlanInput): TripPlanResult {
  const travelMinutes = Math.max(1, Math.ceil(input.durationSeconds / 60));
  const bufferMinutes = Math.max(0, Math.round(input.safetyBufferMinutes));
  const totalLeadMs = (travelMinutes + bufferMinutes) * 60_000;
  const recommendedDepartureAt = new Date(input.desiredArrivalAt.getTime() - totalLeadMs);
  const expectedArrivalAt = new Date(
    recommendedDepartureAt.getTime() + travelMinutes * 60_000,
  );

  return {
    travelMinutes,
    bufferMinutes,
    recommendedDepartureAt,
    expectedArrivalAt,
  };
}

/** Format Date for `<input type="datetime-local">` in local timezone. */
export function toDatetimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function parseDatetimeLocal(value: string): Date | null {
  if (!value?.trim()) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatPlanTime(date: Date, locale = "pt-PT"): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
