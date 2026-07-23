import Link from "next/link";
import { MapPinned, Plus } from "lucide-react";
import { EmptyState, PageHeader, StatCard } from "@/components/shared";
import { Button } from "@/components/ui/button";

export default function ClientDashboardPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Painel"
        description="Acompanhe pedidos abertos, propostas recebidas e viagens confirmadas."
        actions={
          <Link href="/cliente/viagens/nova">
            <Button>
              <Plus className="h-4 w-4" aria-hidden />
              Novo pedido
            </Button>
          </Link>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Pedidos abertos" value="0" hint="A receber propostas" />
        <StatCard label="Propostas" value="0" hint="Por avaliar" />
        <StatCard label="Confirmadas" value="0" hint="Próximas viagens" />
        <StatCard label="Concluídas" value="0" hint="Histórico" />
      </div>
      <EmptyState
        icon={<MapPinned className="h-10 w-10" />}
        title="Ainda não tem viagens"
        description="Crie o primeiro pedido de viagem para começar a receber propostas de motoristas privados."
        actionLabel="Criar pedido"
        actionHref="/cliente/viagens/nova"
      />
    </div>
  );
}
