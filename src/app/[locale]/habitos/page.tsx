import { getLocale } from "next-intl/server";
import { AppShell } from "@/components/layout/AppShell";
import { PageGreeting } from "@/components/ui/PageGreeting";
import { HabitsForm } from "@/components/profile/HabitsForm";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/db";

export default async function HabitosPage() {
  const session = await requireRole(["CUSTOMER"]);
  const locale = await getLocale();

  const profile = await prisma.customerProfile.findUnique({
    where: { userId: session.user.id },
    include: { travelHabits: true },
  });

  const h = profile?.travelHabits;
  let weekdays: string[] = [];
  try {
    weekdays = h?.weekdays ? JSON.parse(h.weekdays) : [];
  } catch {
    weekdays = [];
  }

  const defaults = {
    tripsCount: h?.tripsCount ?? null,
    frequencyUnit: h?.frequencyUnit || "",
    weekdays,
    usualTimes: h?.usualTimes || "",
    usualPickups: h?.usualPickups || "",
    usualDestinations: h?.usualDestinations || "",
    oftenAirport: h?.oftenAirport ?? false,
    oftenRoundTrip: h?.oftenRoundTrip ?? false,
    needsWaiting: h?.needsWaiting ?? false,
    travelsAlone: h?.travelsAlone === true ? "yes" : h?.travelsAlone === false ? "no" : "",
    avgPassengers: h?.avgPassengers ?? null,
    needsChildSeat: h?.needsChildSeat ?? false,
    oftenLuggage: h?.oftenLuggage ?? false,
    otherPreferences: h?.otherPreferences || "",
  };

  return (
    <AppShell userName={session.user.name} showCustomerNav activePath="/perfil" locale={locale}>
      <PageGreeting
        hello="Hábitos de deslocação"
        sub="Ajude-nos a personalizar o serviço — os seus padrões de viagem."
      />
      <HabitsForm defaults={defaults} />
    </AppShell>
  );
}
