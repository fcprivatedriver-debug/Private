import { getTranslations, setRequestLocale } from "next-intl/server";
import { getSessionSafe } from "@/lib/session-safe";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { HomeExperience } from "@/components/home/HomeExperience";
import { prisma } from "@/lib/db";
import { resolveActiveMode } from "@/lib/account-mode";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const session = await getSessionSafe();

  let hasCustomer = false;
  let hasDriver = false;
  let activeMode: "CUSTOMER" | "DRIVER" | null = null;
  const role = session?.user?.role;

  if (session?.user?.id) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          role: true,
          customerProfile: { select: { id: true } },
          driverProfile: { select: { id: true } },
        },
      });
      hasCustomer = Boolean(user?.customerProfile) || user?.role === "CUSTOMER" || user?.role === "ADMIN";
      hasDriver = Boolean(user?.driverProfile) || user?.role === "DRIVER";
      activeMode = resolveActiveMode({
        role: user?.role,
        hasCustomer,
        hasDriver,
        preferred: session.user.activeMode,
      });
    } catch {
      hasCustomer = role === "CUSTOMER" || role === "ADMIN";
      hasDriver = role === "DRIVER";
      activeMode = role === "DRIVER" ? "DRIVER" : "CUSTOMER";
    }
  }

  return (
    <>
      <HomeExperience
        session={{
          signedIn: Boolean(session?.user),
          hasCustomer,
          hasDriver,
          activeMode,
          isAdmin: role === "ADMIN",
        }}
      />
      <SiteFooter termsLabel={t("terms")} privacyLabel={t("privacy")} />
    </>
  );
}
