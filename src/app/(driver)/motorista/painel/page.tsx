import { MapPinned } from "lucide-react";
import { EmptyState, PageHeader, StatCard } from "@/components/shared";

export default function DriverDashboardPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Painel"
        description="Pedidos abertos, propostas enviadas e viagens confirmadas."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Pedidos abertos" value="0" hint="Disponíveis" />
        <StatCard label="Propostas ativas" value="0" hint="A aguardar resposta" />
        <StatCard label="Confirmadas" value="0" hint="Próximas" />
        <StatCard label="Avaliação" value="—" hint="Média" />
      </div>
      <EmptyState
        icon={<MapPinned className="h-10 w-10" />}
        title="Sem atividade recente"
        description="Quando houver pedidos abertos compatíveis com os seus veículos, aparecerão nos pedidos."
        actionLabel="Ver pedidos"
        actionHref="/motorista/pedidos"
      />
    </div>
  );
}
