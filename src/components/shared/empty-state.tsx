import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: ReactNode;
  actionLabel?: string;
  actionHref?: string;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon,
  actionLabel,
  actionHref,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--surface)] px-6 py-16 text-center",
        className,
      )}
    >
      {icon ? (
        <div className="mb-4 text-[var(--muted)]" aria-hidden>
          {icon}
        </div>
      ) : null}
      <h2 className="font-[family-name:var(--font-display)] text-2xl font-medium text-[var(--foreground)]">
        {title}
      </h2>
      <p className="mt-2 max-w-md text-sm text-[var(--muted)]">{description}</p>
      {actionLabel && actionHref ? (
        <Link href={actionHref} className="mt-6 inline-flex">
          <Button>{actionLabel}</Button>
        </Link>
      ) : null}
    </div>
  );
}
