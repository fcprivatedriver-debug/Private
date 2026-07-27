import { requireUser } from "@/lib/session";
import {
  getOrCreateCurrentReport,
  listReports,
} from "@/modules/reports/service";
import { RefreshReportButton } from "@/components/mel/RefreshReportButton";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

type Highlight = { kind: string; text: string };
type Metrics = {
  tasksCreated: number;
  tasksDone: number;
  tasksOpen: number;
  eventsCount: number;
  voiceCaptures: number;
  completionRate: number;
};

export default async function ReportsPage() {
  const { user } = await requireUser();
  const current = await getOrCreateCurrentReport(user.id);
  const reports = await listReports(user.id, 6);
  const metrics = (current.metrics || {}) as Metrics;
  const highlights = (current.highlights || []) as Highlight[];

  return (
    <div className="stack anim-rise">
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <h1 className="page-title">Relatórios semanais</h1>
          <p className="page-lead">O teu ritmo, em perspectiva.</p>
        </div>
        <RefreshReportButton />
      </div>

      <div className="panel">
        <h2>
          Esta semana ·{" "}
          {format(current.weekStart, "d MMM", { locale: pt })} –{" "}
          {format(current.weekEnd, "d MMM", { locale: pt })}
        </h2>
        <p>{current.summary}</p>
        <div className="metrics-grid" style={{ marginTop: "1rem" }}>
          <div className="metric">
            <span className="muted small">Criadas</span>
            <strong>{metrics.tasksCreated ?? 0}</strong>
          </div>
          <div className="metric">
            <span className="muted small">Concluídas</span>
            <strong>{metrics.tasksDone ?? 0}</strong>
          </div>
          <div className="metric">
            <span className="muted small">Em aberto</span>
            <strong>{metrics.tasksOpen ?? 0}</strong>
          </div>
          <div className="metric">
            <span className="muted small">Ritmo</span>
            <strong>{metrics.completionRate ?? 0}%</strong>
          </div>
        </div>
      </div>

      <div className="panel">
        <h2>Destaques</h2>
        <ul className="list-plain">
          {highlights.map((h, i) => (
            <li key={i} className="list-row">
              <span>{h.text}</span>
              <span className="badge">{h.kind}</span>
            </li>
          ))}
        </ul>
      </div>

      {reports.length > 1 ? (
        <div className="panel">
          <h2>Histórico</h2>
          <ul className="list-plain">
            {reports.slice(1).map((r) => (
              <li key={r.id} className="list-row">
                <div>
                  <strong>
                    {format(r.weekStart, "d MMM", { locale: pt })} –{" "}
                    {format(r.weekEnd, "d MMM yyyy", { locale: pt })}
                  </strong>
                  <p className="muted small" style={{ margin: "0.25rem 0 0" }}>
                    {r.summary}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
