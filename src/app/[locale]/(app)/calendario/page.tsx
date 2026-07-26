import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getActiveFamilyForUser } from "@/lib/session";
import { calendarService } from "@/lib/calendar";
import { Panel, EmptyState } from "@/components/ui/FinanceUI";
import { NINA_SLOGAN } from "@/lib/ai/mission";
import { addDays, startOfDay } from "date-fns";

export default async function CalendarioPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/pt/login");
  const membership = await getActiveFamilyForUser(session.user.id);
  if (!membership) redirect("/pt/registo");

  const provider = calendarService.getProvider();
  const connected = await provider.isConnected();
  const now = new Date();
  const events = await provider.listEvents(startOfDay(now), addDays(now, 2));

  return (
    <div className="page-stack">
      <header>
        <p className="nina-kicker">{NINA_SLOGAN} · Calendário</p>
        <h1 className="page-title">O teu calendário</h1>
        <p className="page-sub">
          A Nina nunca cria um calendário privado. Marca eventos no Google Calendar, Apple
          Calendar ou Outlook — com a tua autorização.
        </p>
      </header>

      <Panel title="Ligação">
        {connected ? (
          <p>Calendário ligado ({provider.label}).</p>
        ) : (
          <>
            <EmptyState
              title="Autoriza uma vez"
              body="Concede permissão ao teu calendário. Depois é só voz: «Nina preciso de marcar cabeleireiro amanhã.»"
            />
            <div className="btn-row" style={{ marginTop: "1rem" }}>
              <a
                href={provider.authUrl()}
                className="btn btn-primary"
                target="_blank"
                rel="noopener noreferrer"
              >
                Abrir {provider.label}
              </a>
              <Link href="/pt/captura?mode=voice&auto=1" className="btn btn-ghost">
                🎤 Falar com a Nina
              </Link>
            </div>
          </>
        )}
      </Panel>

      <Panel title="Próximos (pré-visualização)">
        {events.length === 0 ? (
          <p className="muted">Sem eventos no protótipo para este período.</p>
        ) : (
          <ul className="today-insight-list">
            {events.map((e) => (
              <li key={e.id} className="today-insight">
                <strong>{e.title}</strong>
                <span className="muted small" style={{ display: "block" }}>
                  {e.start.toLocaleString("pt-PT", {
                    weekday: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                    day: "2-digit",
                    month: "short",
                  })}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="muted small" style={{ marginTop: "0.75rem" }}>
          Protótipo com horários ilustrativos até OAuth real. Os eventos criados abrem no teu
          calendário externo.
        </p>
      </Panel>

      <Panel title="Lembretes">
        <p className="page-sub" style={{ margin: 0 }}>
          «Lembra-me hoje às 11 para ligar ao cabeleireiro» — a Nina usa o serviço de lembretes /
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
