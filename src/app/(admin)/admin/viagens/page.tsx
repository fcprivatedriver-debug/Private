import { MapPinned } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/shared";

export default function AdminTripsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Viagens"
        description="Monitorização de pedidos, propostas e estados em toda a plataforma."
      />
      <EmptyState
        icon={<MapPinned className="h-10 w-10" />}
        title="Sem viagens"
        description="O histórico global de viagens será apresentado nesta vista."
      />
    </div>
  );
}
