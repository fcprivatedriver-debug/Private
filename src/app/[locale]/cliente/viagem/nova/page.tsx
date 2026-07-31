import { getLocale } from "next-intl/server";
import { AppShell } from "@/components/layout/AppShell";
import { PageGreeting } from "@/components/ui/PageGreeting";
import { TripBookingForm } from "@/components/trip/TripBookingForm";
import { requireRole, getSiteSettings } from "@/lib/session";

export default async function NovaViagemPage() {
  const session = await requireRole(["CUSTOMER"]);
  const locale = await getLocale();
  const settings = await getSiteSettings();

  return (
    <AppShell userName={session.user.name} showCustomerNav activePath="/cliente/viagem/nova" locale={locale}>
      <PageGreeting
        hello="Marcar viagem"
        sub="Indique origem, destino e preferências. Estimamos os minutos antes de confirmar."
      />
      <TripBookingForm minimumChargeMinutes={settings.minimumChargeMinutes} />
    </AppShell>
  );
}
