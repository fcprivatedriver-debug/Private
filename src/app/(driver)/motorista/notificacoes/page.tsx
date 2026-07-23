import { Bell } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/shared";

export default function DriverNotificationsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Notificações"
        description="Novos pedidos, respostas a propostas e atualizações."
      />
      <EmptyState
        icon={<Bell className="h-10 w-10" />}
        title="Caixa vazia"
        description="Ainda não tem notificações."
      />
    </div>
  );
}
