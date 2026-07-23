import { Wallet } from "lucide-react";
import { EmptyState, PageHeader, StatCard } from "@/components/shared";
import { formatPercentFromBps } from "@/lib/utils";
import { commissionConfig } from "@/config/commissions";

export default function DriverEarningsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Ganhos"
        description={`Comissão da plataforma: ${formatPercentFromBps(commissionConfig.defaultRateBps)}. Valores líquidos após comissão.`}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Bruto (mês)" value="€0,00" />
        <StatCard label="Comissões" value="€0,00" />
        <StatCard label="Líquido" value="€0,00" />
      </div>
      <EmptyState
        icon={<Wallet className="h-10 w-10" />}
        title="Sem movimentos"
        description="Os ganhos das viagens concluídas e as comissões associadas serão listados aqui."
      />
    </div>
  );
}
