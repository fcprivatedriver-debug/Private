import { PageHeader } from "@/components/shared";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { commissionConfig } from "@/config/commissions";
import { formatPercentFromBps } from "@/lib/utils";
import { siteConfig } from "@/config/site";

export default function AdminSettingsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Definições"
        description="Configuração geral da plataforma e preparação de pagamentos."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Plataforma</CardTitle>
            <CardDescription>Identidade e contacto de suporte.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between gap-4 border-b border-[var(--border)] py-2">
              <span className="text-[var(--muted)]">Nome</span>
              <span>{siteConfig.name}</span>
            </div>
            <div className="flex justify-between gap-4 border-b border-[var(--border)] py-2">
              <span className="text-[var(--muted)]">Locale</span>
              <span>{siteConfig.locale}</span>
            </div>
            <div className="flex justify-between gap-4 py-2">
              <span className="text-[var(--muted)]">Suporte</span>
              <span>{siteConfig.supportEmail}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Comissões e pagamentos</CardTitle>
            <CardDescription>
              Valores padrão e contrato de gateway preparado.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between gap-4 border-b border-[var(--border)] py-2">
              <span className="text-[var(--muted)]">Comissão padrão</span>
              <span>
                {formatPercentFromBps(commissionConfig.defaultRateBps)}
              </span>
            </div>
            <div className="flex justify-between gap-4 border-b border-[var(--border)] py-2">
              <span className="text-[var(--muted)]">Moeda</span>
              <span>{commissionConfig.currency}</span>
            </div>
            <div className="flex justify-between gap-4 py-2">
              <span className="text-[var(--muted)]">Gateway</span>
              <span>Não configurado (adapter pronto)</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
