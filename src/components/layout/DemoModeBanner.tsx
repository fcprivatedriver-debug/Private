import { prisma } from "@/lib/db";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/config/brand";

export async function DemoModeBanner() {
  let enabled = process.env.DEMO_MODE === "true";
  try {
    const settings = await prisma.siteSettings.findUnique({
      where: { id: "default" },
      select: { demoMode: true },
    });
    enabled = Boolean(settings?.demoMode);
  } catch {
    /* db may be unavailable during build */
  }

  if (!enabled) return null;

  const accounts = DEMO_ACCOUNTS.map((a) => a.email).join(" · ");

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
          <strong style={{ fontWeight: 600 }}>FC Private Driver — Demo</strong>
          <span style={{ opacity: 0.85 }}> — explore como cliente, motorista ou admin.</span>
        </span>
        <span style={{ opacity: 0.75, fontSize: "0.76rem" }}>
          {accounts} · password {DEMO_PASSWORD}
        </span>
      </div>
    </div>
  );
}
