"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Car,
  FileText,
  IdCard,
  LayoutDashboard,
  MapPinned,
  Percent,
  Settings,
  User,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { NavItem } from "@/config/navigation";
import { BrandLogo } from "./brand-logo";
import { cn } from "@/lib/utils";

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  MapPinned,
  FileText,
  Bell,
  User,
  Car,
  Wallet,
  Users,
  IdCard,
  Percent,
  Settings,
};

interface DashboardSidebarProps {
  items: NavItem[];
  roleLabel: string;
}

export function DashboardSidebar({ items, roleLabel }: DashboardSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 border-r border-[var(--border)] bg-[var(--surface)] lg:flex lg:flex-col">
      <div className="flex h-16 items-center border-b border-[var(--border)] px-5">
        <BrandLogo />
      </div>
      <div className="px-5 py-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--muted)]">
          {roleLabel}
        </p>
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-3 pb-6">
        {items.map((item) => {
          const Icon = item.icon ? iconMap[item.icon] : null;
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
                active
                  ? "bg-[var(--accent-soft)] text-[var(--accent-foreground-soft)]"
                  : "text-[var(--muted-foreground)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]",
              )}
            >
              {Icon ? <Icon className="h-4 w-4 shrink-0" aria-hidden /> : null}
              <span>{item.title}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
