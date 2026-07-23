import { PageHeader } from "@/components/shared";
import { CreateProposalForm } from "@/components/proposals";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface DriverRequestDetailProps {
  params: Promise<{ id: string }>;
}

export default async function DriverRequestDetailPage({
  params,
}: DriverRequestDetailProps) {
  const { id } = await params;

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Pedido ${id}`}
        description="Consulte o pedido e envie a sua proposta."
      />
      <Card>
        <CardHeader>
          <CardTitle>Detalhe do pedido</CardTitle>
          <CardDescription>
            Origem, destino, horário e requisitos do cliente.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-[var(--muted)]">
          Estrutura pronta para dados do pedido quando a API estiver ligada.
        </CardContent>
      </Card>
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Enviar proposta</CardTitle>
          <CardDescription>
            Defina preço, veículo e mensagem para o cliente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateProposalForm tripId={id} />
        </CardContent>
      </Card>
    </div>
  );
}
