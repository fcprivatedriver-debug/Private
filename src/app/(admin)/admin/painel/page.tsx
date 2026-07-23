import { PageHeader, StatCard } from "@/components/shared";

export default function AdminDashboardPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Painel de administração"
        description="Visão geral da plataforma, utilizadores e atividade."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Clientes" value="0" />
        <StatCard label="Motoristas" value="0" />
        <StatCard label="Viagens ativas" value="0" />
        <StatCard label="Comissões (mês)" value="€0,00" />
      </div>
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 text-sm text-[var(--muted)]">
        Estrutura pronta para métricas em tempo real, filas de verificação de
        motoristas e alertas operacionais.
      </div>
    </div>
  );
}
