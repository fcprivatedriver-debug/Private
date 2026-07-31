import { auth } from "@/lib/auth";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { dashboardPathForRole } from "@/lib/auth-routes";
import { RegisterForm } from "@/components/auth/RegisterForm";

export default async function RegisterPage() {
  const session = await auth();
  if (session?.user) {
    const locale = await getLocale();
    redirect({ href: dashboardPathForRole(session.user.role), locale });
  }

  return <RegisterForm />;
}
