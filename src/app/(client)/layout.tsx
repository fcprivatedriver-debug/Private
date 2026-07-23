import type { ReactNode } from "react";
import { DashboardShell } from "@/components/layout";
import { clientNav } from "@/config/navigation";
import { roleLabels } from "@/config/roles";

export default function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardShell
      nav={clientNav}
      roleLabel={roleLabels.client}
      topbarTitle="Área do cliente"
    >
      {children}
    </DashboardShell>
  );
}
