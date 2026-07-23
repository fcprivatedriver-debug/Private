import type { ReactNode } from "react";
import { DashboardShell } from "@/components/layout";
import { driverNav } from "@/config/navigation";
import { roleLabels } from "@/config/roles";

export default function DriverLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardShell
      nav={driverNav}
      roleLabel={roleLabels.driver}
      topbarTitle="Área do motorista"
    >
      {children}
    </DashboardShell>
  );
}
