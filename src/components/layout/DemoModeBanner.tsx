import { isDemoMode } from "@/lib/demo-mode";
import { Link } from "@/i18n/navigation";

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
          <strong style={{ fontWeight: 600 }}>ZRIK Demo</strong>
          <span style={{ opacity: 0.85 }}>
            {" "}
            — Sandbox E2E pronto.{" "}
            <Link href="/demo-e2e" style={{ textDecoration: "underline", color: "inherit" }}>
              Guia de teste
            </Link>
            {" · "}
            <Link href="/demo/emails" style={{ textDecoration: "underline", color: "inherit" }}>
              Emails
            </Link>
          </span>
        </span>
        <span style={{ opacity: 0.75, fontSize: "0.76rem" }}>
          cliente@movio.app · motorista@movio.app · admin@movio.app · movio123
        </span>
      </div>
    </div>
  );
}
