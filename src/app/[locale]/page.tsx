import { auth } from "@/lib/auth";
import { redirect } from "@/i18n/navigation";
import { setRequestLocale } from "next-intl/server";
import { dashboardPathForRole } from "@/lib/auth-routes";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

/**
 * App entry — never renders marketing UI.
 * Middleware also enforces this; the page is a server-side fallback.
 */
export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await auth();
  const role = session?.user?.role;

  if (!role) {
    return redirect({ href: "/login", locale });
  }

  return redirect({ href: dashboardPathForRole(role), locale });
}
