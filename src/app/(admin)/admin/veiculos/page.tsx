import { Car } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/shared";

export default function AdminVehiclesPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Veículos"
        description="Revisão e moderação de veículos submetidos pelos motoristas."
      />
      <EmptyState
        icon={<Car className="h-10 w-10" />}
        title="Sem veículos"
        description="Veículos pendentes de revisão serão listados aqui."
      />
    </div>
  );
}
