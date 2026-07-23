import Link from "next/link";
import { MapPinned, Plus } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { TripList } from "@/components/trips";
import type { TripSummary } from "@/types";

const trips: TripSummary[] = [];

export default function ClientTripsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Viagens"
        description="Histórico e pedidos ativos de transferência privada."
        actions={
          <Link href="/cliente/viagens/nova">
            <Button>
              <Plus className="h-4 w-4" aria-hidden />
              Novo pedido
            </Button>
          </Link>
        }
      />
      {trips.length > 0 ? (
        <TripList trips={trips} detailBasePath="/cliente/viagens" />
      ) : (
        <EmptyState
          icon={<MapPinned className="h-10 w-10" />}
          title="Sem viagens para mostrar"
          description="Os seus pedidos e o histórico aparecerão aqui."
          actionLabel="Criar pedido"
          actionHref="/cliente/viagens/nova"
        />
      )}
    </div>
  );
}
