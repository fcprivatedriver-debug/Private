import { Link } from "@/i18n/navigation";

export function EmptyState({
  title,
  body,
  actionHref,
  actionLabel,
}: {
  title: string;
  body: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="empty-state fade-up">
      <h3 className="font-display">{title}</h3>
      <p>{body}</p>
      {actionHref && actionLabel ? (
        <Link href={actionHref} className="btn btn-primary btn-sm">
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
