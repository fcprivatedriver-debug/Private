import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { dashboardPathForRole } from "@/lib/auth-routes";
import { LoginForm } from "@/components/auth/LoginForm";
import { getSessionSafe } from "@/lib/session-safe";

export default async function LoginPage() {
  const session = await getSessionSafe();
  if (session?.user) {
    const locale = await getLocale();
    redirect({ href: dashboardPathForRole(session.user.role), locale });
  }

  return <LoginForm />;
}
