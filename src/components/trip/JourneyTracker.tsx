import { JOURNEY_STEPS, TRIP_STATUS_LABELS } from "@/config/constants";

export function JourneyTracker({
  status,
  offerCount = 0,
}: {
  status: string;
  offerCount?: number;
}) {
  if (["CANCELLED", "EXPIRED", "DRAFT"].includes(status)) {
    return (
      <div className="panel" style={{ marginBottom: "1.25rem" }}>
        <span className="badge">{TRIP_STATUS_LABELS[status] || status}</span>
      </div>
    );
  }

  let current = "SEARCHING";
  if (status === "OPEN" && offerCount > 0) current = "OFFERS";
  else if (status === "OFFER_ACCEPTED") current = "SELECTED";
  else if (status === "CONFIRMED") current = "PAID";
  else if (status === "DRIVER_EN_ROUTE") current = "EN_ROUTE";
  else if (status === "DRIVER_ARRIVED") current = "ARRIVED";
  else if (status === "IN_PROGRESS") current = "IN_PROGRESS";
  else if (status === "COMPLETED") current = "DONE";

  const currentIdx = JOURNEY_STEPS.findIndex((s) => s.key === current);

  return (
    <div className="panel" style={{ marginBottom: "1.25rem" }}>
      <div
        className="muted"
        style={{
          marginBottom: "0.75rem",
          fontSize: "0.82rem",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        Estado da viagem
      </div>
      <div style={{ display: "grid", gap: "0.55rem" }}>
        {JOURNEY_STEPS.map((step, idx) => {
          const done = idx < currentIdx;
          const isCurrent = step.key === current;
          return (
            <div
              key={step.key}
              style={{
                display: "flex",
                gap: "0.65rem",
                alignItems: "center",
                opacity: done || isCurrent ? 1 : 0.4,
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 999,
                  background: isCurrent
                    ? "var(--accent)"
                    : done
                      ? "var(--brand)"
                      : "var(--line-strong)",
                }}
              />
              <span style={{ fontWeight: isCurrent ? 650 : 450, fontSize: "0.95rem" }}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
