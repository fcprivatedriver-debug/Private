import { FileText } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/shared";
import { ProposalList } from "@/components/proposals";
import type { ProposalWithDriver } from "@/types";

const proposals: ProposalWithDriver[] = [];

export default function ClientProposalsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Propostas"
        description="Compare propostas recebidas e escolha a melhor opção."
      />
      {proposals.length > 0 ? (
        <ProposalList proposals={proposals} selectable />
      ) : (
        <EmptyState
          icon={<FileText className="h-10 w-10" />}
          title="Sem propostas"
          description="Quando os motoristas responderem aos seus pedidos, as propostas aparecem aqui."
          actionLabel="Ver viagens"
          actionHref="/cliente/viagens"
        />
      )}
    </div>
  );
}
