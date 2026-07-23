import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared";
import { ProposalList } from "@/components/proposals";
import { ReviewForm } from "@/components/reviews";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface TripDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ClientTripDetailPage({
  params,
}: TripDetailPageProps) {
  const { id } = await params;

  if (!id) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Viagem ${id}`}
        description="Detalhe do pedido, propostas recebidas e avaliação."
      />
      <Card>
        <CardHeader>
          <CardTitle>Resumo</CardTitle>
          <CardDescription>
            Os dados do pedido serão carregados quando a API estiver ligada.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-[var(--muted)]">
          Estrutura pronta para origem, destino, horário, classe e estado.
        </CardContent>
      </Card>
      <section className="space-y-4">
        <h2 className="font-[family-name:var(--font-display)] text-2xl">
          Propostas
        </h2>
        <ProposalList proposals={[]} selectable />
        <p className="text-sm text-[var(--muted)]">
          Ainda não existem propostas para este pedido.
        </p>
      </section>
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Avaliar viagem</CardTitle>
          <CardDescription>
            Disponível após a conclusão do serviço.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ReviewForm tripId={id} />
        </CardContent>
      </Card>
    </div>
  );
}
