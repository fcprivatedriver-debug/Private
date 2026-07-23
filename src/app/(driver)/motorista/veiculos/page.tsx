import Link from "next/link";
import { Car, Plus } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";

export default function DriverVehiclesPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Veículos"
        description="Gerir a frota associada às suas propostas."
        actions={
          <Link href="/motorista/veiculos/novo">
            <Button>
              <Plus className="h-4 w-4" aria-hidden />
              Adicionar veículo
            </Button>
          </Link>
        }
      />
      <EmptyState
        icon={<Car className="h-10 w-10" />}
        title="Nenhum veículo registado"
        description="Adicione pelo menos um veículo para poder enviar propostas."
        actionLabel="Adicionar veículo"
        actionHref="/motorista/veiculos/novo"
      />
    </div>
  );
}
