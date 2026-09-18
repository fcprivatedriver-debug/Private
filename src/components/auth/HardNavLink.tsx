"use client";

import type { ReactNode, MouseEvent } from "react";

/**
 * Full document navigation for critical auth entry points.
 * Soft-nav RSC can keep a broken locale shell (landing) while only the URL changes.
 */
export function HardNavLink({
  href,
  className,
  children,
  "aria-label": ariaLabel,
}: {
  href: string;
  className?: string;
  children: ReactNode;
  "aria-label"?: string;
}) {
  function onClick(e: MouseEvent<HTMLAnchorElement>) {
    // Allow modified clicks (new tab, etc.)
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    window.location.assign(href);
  }

  return (
    <a href={href} className={className} aria-label={ariaLabel} onClick={onClick}>
      {children}
    </a>
  );
}
