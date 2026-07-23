import type { ReactNode } from "react";
import type { NavItem } from "@/config/navigation";
import { DashboardSidebar } from "./dashboard-sidebar";
import { DashboardTopbar } from "./dashboard-topbar";

interface DashboardShellProps {
  children: ReactNode;
  nav: NavItem[];
  roleLabel: string;
  topbarTitle?: string;
}

export function DashboardShell({
  children,
  nav,
  roleLabel,
  topbarTitle,
}: DashboardShellProps) {
  return (
    <div className="flex min-h-screen bg-[var(--background)]">
      <DashboardSidebar items={nav} roleLabel={roleLabel} />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardTopbar items={nav} title={topbarTitle} />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
