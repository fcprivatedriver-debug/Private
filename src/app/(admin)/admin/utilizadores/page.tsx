import { Users } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/shared";

export default function AdminUsersPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Utilizadores"
        description="Gestão de contas de clientes, motoristas e administradores."
      />
      <EmptyState
        icon={<Users className="h-10 w-10" />}
        title="Sem utilizadores listados"
        description="A listagem e filtros de utilizadores serão ligados à camada de dados."
      />
    </div>
  );
}
