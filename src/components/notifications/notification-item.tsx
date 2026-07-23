import Link from "next/link";
import type { Notification } from "@/types";
import { cn, formatDateTime } from "@/lib/utils";

interface NotificationItemProps {
  notification: Notification;
}

export function NotificationItem({ notification }: NotificationItemProps) {
  const content = (
    <article
      className={cn(
        "rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 transition-colors",
        !notification.readAt && "border-l-2 border-l-[var(--accent)]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium">{notification.title}</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">{notification.body}</p>
        </div>
        <time className="shrink-0 text-xs text-[var(--muted)]">
          {formatDateTime(notification.createdAt)}
        </time>
      </div>
    </article>
  );

  if (notification.href) {
    return (
      <Link href={notification.href} className="block hover:opacity-95">
        {content}
      </Link>
    );
  }

  return content;
}
