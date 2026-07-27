import { requireUser } from "@/lib/session";
import { listWeek } from "@/modules/calendar/service";
import { EventList } from "@/components/mel/EventList";

export default async function CalendarPage() {
  const { user } = await requireUser();
  const events = await listWeek(user.id);

  return (
    <div className="anim-rise">
      <h1 className="page-title">Calendário</h1>
      <p className="page-lead">Compromissos desta semana.</p>
      <EventList initial={events} />
    </div>
  );
}
