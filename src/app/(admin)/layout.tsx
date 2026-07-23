import type { ReactNode } from "react";
import { DashboardShell } from "@/components/layout";
import { adminNav } from "@/config/navigation";
import { roleLabels } from "@/config/roles";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardShell
      nav={adminNav}
      roleLabel={roleLabels.admin}
      topbarTitle="Administração"
    >
      {children}
    </DashboardShell>
  );
}
