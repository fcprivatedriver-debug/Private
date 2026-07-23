import { PageHeader } from "@/components/shared";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CreateTripForm } from "@/components/trips";

export default function NewTripPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Novo pedido de viagem"
        description="Publique o pedido e receba propostas de motoristas disponíveis."
      />
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Detalhes do pedido</CardTitle>
          <CardDescription>
            Quanto mais completo o pedido, melhores as propostas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateTripForm />
        </CardContent>
      </Card>
    </div>
  );
}
