import { isDemoMode } from "@/lib/demo-mode";

export async function DemoModeBanner() {
  const enabled = await isDemoMode();
  if (!enabled) return null;

  return (
    <div className="demo-banner" role="status">
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
          <strong style={{ fontWeight: 600 }}>Hegos Demo</strong>
          <span style={{ opacity: 0.85 }}>
            {" "}
            — sample journeys are ready. Explore as guest, chauffeur, or admin.
          </span>
        </span>
        <span style={{ opacity: 0.75, fontSize: "0.76rem" }}>
          cliente@movio.app · motorista@movio.app · admin@movio.app · movio123
        </span>
      </div>
    </div>
  );
}
