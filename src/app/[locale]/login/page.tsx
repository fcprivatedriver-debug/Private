import { getTranslations } from "next-intl/server";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { LoginForm } from "@/components/auth/LoginForm";

export default async function LoginPage() {
  const t = await getTranslations("auth");

  return (
    <div className="mel-atmosphere auth-shell">
      <div style={{ position: "absolute", top: 0, insetInline: 0 }}>
        <SiteHeader />
      </div>
      <div className="auth-panel anim-rise">
        <h1>{t("loginTitle")}</h1>
        <p className="muted">{t("loginSubtitle")}</p>
        <LoginForm />
      </div>
    </div>
  );
}
