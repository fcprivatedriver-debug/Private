import { IdCard } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/shared";

export default function AdminDriversPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Motoristas"
        description="Verificação, suspensão e acompanhamento de performance."
      />
      <EmptyState
        icon={<IdCard className="h-10 w-10" />}
        title="Sem motoristas"
        description="Pedidos de verificação e perfis de motoristas aparecerão aqui."
      />
    </div>
  );
}
