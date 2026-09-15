import { formatEUR } from "@/lib/money";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  valueCents,
  tone = "neutral",
  hint,
}: {
  label: string;
  valueCents: number;
  tone?: "neutral" | "income" | "expense" | "savings";
  hint?: string;
}) {
  return (
    <article className={cn("stat-card", `tone-${tone}`)}>
      <p className="stat-label">{label}</p>
      <p className="stat-value">{formatEUR(valueCents)}</p>
      {hint ? <p className="stat-hint">{hint}</p> : null}
    </article>
  );
}

export function ProgressBar({
  percent,
  color,
  label,
}: {
  percent: number;
  color?: string;
  label?: string;
}) {
  const pct = Math.min(100, Math.max(0, percent));
  const danger = percent >= 100;
  const warn = percent >= 75 && !danger;
  return (
    <div className="progress-wrap">
      {label ? (
        <div className="progress-meta">
          <span>{label}</span>
          <span className={cn(danger && "text-danger", warn && "text-warn")}>{percent}%</span>
        </div>
      ) : null}
      <div className="progress-track" aria-hidden>
        <div
          className={cn("progress-fill", danger && "is-danger", warn && "is-warn")}
          style={{ width: `${pct}%`, background: !danger && !warn ? color : undefined }}
        />
      </div>
    </div>
  );
}

export function CategoryBars({
  items,
}: {
  items: { name: string; color: string; cents: number }[];
}) {
  const max = Math.max(...items.map((i) => i.cents), 1);
  return (
    <div className="cat-bars">
      {items.map((item) => (
        <div key={item.name} className="cat-bar-row">
          <div className="cat-bar-label">
            <span className="dot" style={{ background: item.color }} />
            <span>{item.name}</span>
            <strong>{formatEUR(item.cents)}</strong>
          </div>
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{ width: `${(item.cents / max) * 100}%`, background: item.color }}
            />
          </div>
        </div>
      ))}
      {items.length === 0 ? <p className="muted">Sem dados neste período.</p> : null}
    </div>
  );
}

export function EvolutionChart({
  points,
}: {
  points: { label: string; incomeCents: number; expenseCents: number }[];
}) {
  const max = Math.max(...points.flatMap((p) => [p.incomeCents, p.expenseCents]), 1);
  return (
    <div className="evo-chart" role="img" aria-label="Evolução mensal">
      {points.map((p) => (
        <div key={p.label} className="evo-col">
          <div className="evo-bars">
            <div
              className="evo-bar income"
              style={{ height: `${(p.incomeCents / max) * 100}%` }}
              title={`Receitas ${formatEUR(p.incomeCents)}`}
            />
            <div
              className="evo-bar expense"
              style={{ height: `${(p.expenseCents / max) * 100}%` }}
              title={`Despesas ${formatEUR(p.expenseCents)}`}
            />
          </div>
          <span className="evo-label">{p.label}</span>
        </div>
      ))}
    </div>
  );
}

export function Panel({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("panel", className)}>
      <header className="panel-head">
        <h2>{title}</h2>
        {action}
      </header>
      <div className="panel-body">{children}</div>
    </section>
  );
}

export function EmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <div className="empty-state">
      <p className="empty-title">{title}</p>
      {body ? <p className="muted">{body}</p> : null}
    </div>
  );
}
