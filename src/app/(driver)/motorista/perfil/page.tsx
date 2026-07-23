import { PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function DriverProfilePage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Perfil"
        description="Dados profissionais, carta de condução e biografia."
      />
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Perfil do motorista</CardTitle>
          <CardDescription>
            Informação apresentada aos clientes nas propostas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">Nome</Label>
                <Input id="firstName" name="firstName" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Apelido</Label>
                <Input id="lastName" name="lastName" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" name="phone" type="tel" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="licenseNumber">N.º carta de condução</Label>
              <Input id="licenseNumber" name="licenseNumber" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Biografia</Label>
              <Textarea
                id="bio"
                name="bio"
                placeholder="Experiência, línguas, especialidades…"
              />
            </div>
            <label className="flex items-center gap-3 text-sm">
              <input type="checkbox" name="isAvailable" defaultChecked />
              Disponível para novos pedidos
            </label>
            <Button type="submit">Guardar perfil</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
