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

export default function ClientProfilePage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Perfil"
        description="Gerir dados pessoais e preferências de viagem."
      />
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Dados do cliente</CardTitle>
          <CardDescription>
            Informações usadas nas suas reservas e comunicações.
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
              <Label htmlFor="notes">Notas de recolha predefinidas</Label>
              <Textarea
                id="notes"
                name="notes"
                placeholder="Ex.: aguardar na saída de chegadas"
              />
            </div>
            <Button type="submit">Guardar perfil</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
