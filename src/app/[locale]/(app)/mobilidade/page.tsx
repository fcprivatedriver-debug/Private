import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getActiveFamilyForUser } from "@/lib/session";
import { buildTodayBriefing } from "@/lib/ai/today";
import { Panel } from "@/components/ui/FinanceUI";
import { NINA_SLOGAN } from "@/lib/ai/mission";
import { NavAppPicker } from "@/components/nina/NavAppPicker";

export default async function MobilidadePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/pt/login");
  const membership = await getActiveFamilyForUser(session.user.id);
  if (!membership) redirect("/pt/registo");

  const briefing = await buildTodayBriefing(membership.familyId, session.user.id);
  const mobilityTips = briefing.insights.filter(
    (i) => i.kind === "mobility" || i.kind === "tip",
  );

  return (
    <div className="page-stack">
      <header>
        <p className="nina-kicker">{NINA_SLOGAN} · Mobilidade</p>
        <h1 className="page-title">Mobilidade inteligente</h1>
        <p className="page-sub">
          Combustível, elétrico e navegação — a Nina decide por ti. Diz simplesmente o que
          precisas.
        </p>
      </header>

      <Panel title="Fala comigo">
        <div className="btn-row" style={{ flexWrap: "wrap" }}>
          <Link href="/pt/captura?mode=voice&auto=1" className="btn btn-primary">
            🎤 Onde abasteço?
          </Link>
          <Link href="/pt/captura?mode=voice&auto=1" className="btn btn-ghost">
            Tenho 30% de bateria
          </Link>
          <Link href="/pt/dashboard" className="btn btn-ghost">
            Conversar
          </Link>
        </div>
        <p className="muted small" style={{ marginTop: "1rem" }}>
          Exemplos: «Nina onde abasteço?», «Nina tenho 30% de bateria», «Nina leva-me ao posto
          mais barato.»
        </p>
      </Panel>

      {mobilityTips.length > 0 ? (
        <Panel title="Para hoje">
          <ul className="today-insight-list">
            {mobilityTips.map((tip, i) => (
              <li key={i} className="today-insight">
                {tip.text}
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      <Panel title="App de navegação preferida">
        <p className="muted small" style={{ marginBottom: "0.75rem" }}>
          A Nina abre a tua app favorita — Google Maps, Waze ou Apple Maps.
        </p>
        <NavAppPicker />
      </Panel>

      <p className="muted small">
        Arquitetura modular: Fuel Service → providers · EV Service → charging providers ·
        Navigation. A UI nunca fala directamente com os providers.
      </p>
    </div>
  );
}
