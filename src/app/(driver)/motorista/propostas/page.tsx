import { FileText } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/shared";
import { ProposalList } from "@/components/proposals";
import type { ProposalWithDriver } from "@/types";

const proposals: ProposalWithDriver[] = [];

export default function DriverProposalsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Propostas"
        description="Acompanhe o estado das propostas que enviou."
      />
      {proposals.length > 0 ? (
        <ProposalList proposals={proposals} />
      ) : (
        <EmptyState
          icon={<FileText className="h-10 w-10" />}
          title="Sem propostas enviadas"
          description="Responda a pedidos abertos para começar a receber aceitações."
          actionLabel="Ver pedidos"
          actionHref="/motorista/pedidos"
        />
      )}
    </div>
  );
}
