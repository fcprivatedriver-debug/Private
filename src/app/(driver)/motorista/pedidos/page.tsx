import { MapPinned } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/shared";
import { TripList } from "@/components/trips";
import type { TripSummary } from "@/types";

const trips: TripSummary[] = [];

export default function DriverRequestsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Pedidos"
        description="Pedidos de viagem abertos a propostas na sua área."
      />
      {trips.length > 0 ? (
        <TripList trips={trips} detailBasePath="/motorista/pedidos" />
      ) : (
        <EmptyState
          icon={<MapPinned className="h-10 w-10" />}
          title="Nenhum pedido aberto"
          description="Novos pedidos compatíveis com a sua frota serão listados aqui."
        />
      )}
    </div>
  );
}
