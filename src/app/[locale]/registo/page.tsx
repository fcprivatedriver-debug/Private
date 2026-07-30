import { getTranslations } from "next-intl/server";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { RegisterForm } from "@/components/auth/RegisterForm";

export default async function RegisterPage() {
  const t = await getTranslations("auth");

  return (
    <div className="mel-atmosphere auth-shell">
      <div style={{ position: "absolute", top: 0, insetInline: 0 }}>
        <SiteHeader />
      </div>
      <div className="auth-panel anim-rise">
        <h1>{t("registerTitle")}</h1>
        <p className="muted">{t("registerSubtitle")}</p>
        <RegisterForm />
      </div>
    </div>
  );
}
