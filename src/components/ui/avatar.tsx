import type { HTMLAttributes } from "react";
import { cn, getInitials } from "@/lib/utils";

interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  firstName: string;
  lastName: string;
  src?: string | null;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-base",
} as const;

export function Avatar({
  firstName,
  lastName,
  src,
  size = "md",
  className,
  ...props
}: AvatarProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center justify-center overflow-hidden rounded-full bg-[var(--surface-elevated)] font-medium text-[var(--foreground)] ring-1 ring-[var(--border)]",
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={`${firstName} ${lastName}`}
          className="h-full w-full object-cover"
        />
      ) : (
        <span aria-hidden>{getInitials(firstName, lastName)}</span>
      )}
    </div>
  );
}
