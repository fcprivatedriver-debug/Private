import { requireUser } from "@/lib/session";
import { listHabits, loggedToday, logsThisWeek } from "@/modules/habits/service";
import { ObjectivesPanel } from "@/components/mel/ObjectivesPanel";

export default async function ObjectivesPage() {
  const { user } = await requireUser();
  const habits = await listHabits(user.id, { includeInactive: false });

  return (
    <div className="stack anim-rise">
      <div>
        <h1 className="page-title">Objectivos</h1>
        <p className="page-lead">
          Hábitos e rotinas editáveis — marca o que fizeste hoje.
        </p>
      </div>
      <ObjectivesPanel
        initial={habits.map((h) => ({
          ...h,
          doneToday: loggedToday(h),
          weekCount: logsThisWeek(h),
        }))}
      />
    </div>
  );
}
