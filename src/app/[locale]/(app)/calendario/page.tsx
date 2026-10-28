import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getActiveFamilyForUser } from "@/lib/session";
import { Panel, EmptyState } from "@/components/ui/FinanceUI";
import { NINA_SLOGAN } from "@/lib/ai/mission";

export default async function CalendarioPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/pt/login");
  const membership = await getActiveFamilyForUser(session.user.id);
  if (!membership) redirect("/pt/registo");

  return (
    <div className="page-stack">
      <header>
        <p className="nina-kicker">{NINA_SLOGAN} · Calendário</p>
        <h1 className="page-title">O teu calendário</h1>
        <p className="page-sub">
          A sincronização com Google Calendar, Outlook e Apple Calendar ainda é experimental
          e não está ligada. A addYknow não lê a tua agenda.
        </p>
      </header>

      <Panel title="Ligação">
        <EmptyState
          title="Ainda sem sincronização"
          body="Google Calendar, Outlook e o calendário da Apple não estão ligados. Não há leitura automática da agenda. Podes abrir o Google Calendar no browser para criar um evento à mão."
        />
        <div className="btn-row" style={{ marginTop: "1rem" }}>
          <a
            href="https://calendar.google.com/"
            className="btn btn-primary"
            target="_blank"
            rel="noopener noreferrer"
          >
            Abrir Google Calendar
          </a>
          <Link href="/pt/captura?mode=voice&auto=1" className="btn btn-ghost">
            Falar com a MEL
          </Link>
        </div>
        <p className="muted small" style={{ marginTop: "0.75rem" }}>
          Quando a ligação existir, os eventos aparecem aqui com a tua autorização.
        </p>
      </Panel>

      <Panel title="Lembretes">
        <p className="page-sub" style={{ margin: 0 }}>
          «Lembra-me hoje às 11 para ligar ao cabeleireiro» — a MEL usa o serviço de lembretes /
          calendário do sistema, sem duplicar a funcionalidade.
        </p>
        <div className="btn-row" style={{ marginTop: "1rem" }}>
          <Link
            href="/pt/captura?mode=voice&auto=1&q=lembra-me%20daqui%20a%20duas%20horas"
            className="btn btn-ghost"
          >
            Lembra-me daqui a 2h
          </Link>
        </div>
      </Panel>
    </div>
  );
}
