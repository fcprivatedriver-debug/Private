import { Bell } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/shared";

export default function ClientNotificationsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Notificações"
        description="Alertas de propostas, confirmações e atualizações de viagem."
      />
      <EmptyState
        icon={<Bell className="h-10 w-10" />}
        title="Caixa vazia"
        description="Ainda não tem notificações. Novas atividades da plataforma aparecerão aqui."
      />
    </div>
  );
}
