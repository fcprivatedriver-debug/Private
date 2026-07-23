import { Percent } from "lucide-react";
import { EmptyState, PageHeader, StatCard } from "@/components/shared";
import { commissionConfig } from "@/config/commissions";
import { formatPercentFromBps } from "@/lib/utils";

export default function AdminCommissionsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Comissões"
        description="Regras e recolha de comissões da plataforma."
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Taxa padrão"
          value={formatPercentFromBps(commissionConfig.defaultRateBps)}
        />
        <StatCard label="Pendente" value="€0,00" />
        <StatCard label="Recolhido (mês)" value="€0,00" />
      </div>
      <EmptyState
        icon={<Percent className="h-10 w-10" />}
        title="Sem registos de comissão"
        description="As comissões calculadas por viagem aparecerão após as primeiras transações."
      />
    </div>
  );
}
