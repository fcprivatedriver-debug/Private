import { isDemoMode } from "@/lib/demo-mode";

export async function DemoModeBanner() {
  const enabled = await isDemoMode();
  if (!enabled) return null;

  return (
    <div
      role="status"
      style={{
        background: "var(--brand)",
        color: "#f4f6f5",
        fontSize: "0.82rem",
        letterSpacing: "0.02em",
        padding: "0.55rem 0",
        borderBottom: "1px solid rgba(244,246,245,0.12)",
      }}
    >
      <div
        className="container"
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "1rem",
          flexWrap: "wrap",
          alignItems: "baseline",
        }}
      >
        <span>
          <strong style={{ fontWeight: 600 }}>Demo Mode</strong>
          <span style={{ opacity: 0.85 }}>
            {" "}
            — realistic sample data is loaded. Explore as customer, driver, or admin.
          </span>
        </span>
        <span style={{ opacity: 0.75, fontSize: "0.78rem" }}>
          cliente@movio.app · motorista@movio.app · admin@movio.app · movio123
        </span>
      </div>
    </div>
  );
}
