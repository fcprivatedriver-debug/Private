import { PageHeader } from "@/components/shared";
import { VehicleForm } from "@/components/vehicles";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function NewVehiclePage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Novo veículo"
        description="Registe um veículo para utilizar nas propostas."
      />
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Dados do veículo</CardTitle>
          <CardDescription>
            Informações visíveis ao cliente nas propostas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <VehicleForm />
        </CardContent>
      </Card>
    </div>
  );
}
