import { getLocale } from "next-intl/server";
import { AppShell } from "@/components/layout/AppShell";
import { PageGreeting } from "@/components/ui/PageGreeting";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/db";
import { Link } from "@/i18n/navigation";

export default async function PerfilPage() {
  const session = await requireRole(["CUSTOMER"]);
  const locale = await getLocale();

  const profile = await prisma.customerProfile.findUnique({
    where: { userId: session.user.id },
  });

  const defaults = {
    fullName: profile?.fullName || session.user.name || "",
    addressLine: profile?.addressLine || "",
    postalCode: profile?.postalCode || "",
    city: profile?.city || "",
    birthDate: profile?.birthDate ? profile.birthDate.toISOString().slice(0, 10) : "",
    taxId: profile?.taxId || "",
    phone: profile?.phone || "",
    altPhone: profile?.altPhone || "",
    notes: profile?.notes || "",
  };

  return (
    <AppShell userName={session.user.name} showCustomerNav activePath="/perfil" locale={locale}>
      <PageGreeting
        hello="O seu perfil"
        sub="Dados de contacto e faturação. Complete o perfil para aceder ao painel de cliente."
      />
      <ProfileForm defaults={defaults} />
      <p className="muted" style={{ marginTop: "1rem" }}>
        <Link href="/habitos" style={{ textDecoration: "underline" }}>
          Hábitos de deslocação →
        </Link>
      </p>
    </AppShell>
  );
}
