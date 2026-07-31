import { setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/db";
import { getSiteSettings } from "@/lib/session";
import { LandingPage } from "@/components/landing/LandingPage";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [settings, plans] = await Promise.all([
    getSiteSettings(),
    prisma.plan.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  return <LandingPage settings={settings} plans={plans} locale={locale} />;
}
