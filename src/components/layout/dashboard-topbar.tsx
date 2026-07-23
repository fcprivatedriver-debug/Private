"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "@/config/navigation";
import { cn } from "@/lib/utils";
import { BrandLogo } from "./brand-logo";

interface DashboardTopbarProps {
  items: NavItem[];
  title?: string;
}

export function DashboardTopbar({ items, title }: DashboardTopbarProps) {
  const pathname = usePathname();

  return (
    <div className="border-b border-[var(--border)] bg-[var(--surface)]">
      <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4 lg:hidden">
          <BrandLogo />
        </div>
        <div className="hidden lg:block">
          {title ? (
            <p className="text-sm text-[var(--muted)]">{title}</p>
          ) : null}
        </div>
        <Link
          href="/"
          className="text-sm text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
        >
          Ver site
        </Link>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:hidden">
        {items.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "shrink-0 rounded-md px-3 py-2 text-xs font-medium",
                active
                  ? "bg-[var(--accent-soft)] text-[var(--accent-foreground-soft)]"
                  : "text-[var(--muted)] hover:bg-[var(--surface-hover)]",
              )}
            >
              {item.title}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
