import { activateAccountAction } from "@/actions/auth";
import { ResendActivationForm } from "@/components/auth/ResendActivationForm";
import { Link } from "@/i18n/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string }>;
};

export default async function AtivarPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { token } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("auth");

  let result: Awaited<ReturnType<typeof activateAccountAction>> | null = null;
  if (token) {
    result = await activateAccountAction(token);
  }

  const showResend =
    !token ||
    result?.code === "expired" ||
    result?.code === "invalid" ||
    result?.code === "missing";

  return (
    <section className="auth-shell fade-up">
      <div className="container" style={{ maxWidth: 520 }}>
        <h1 className="page-title">{t("activateTitle")}</h1>

        {!token && (
          <>
            <p className="page-lead">{t("activateMissing")}</p>
            <ResendActivationForm />
            <p className="muted" style={{ marginTop: "1.25rem" }}>
              <Link href="/login" style={{ textDecoration: "underline" }}>
                {t("loginLink")}
              </Link>
            </p>
          </>
        )}

        {result?.error && (
          <>
            <div className="alert alert-error" style={{ whiteSpace: "pre-line" }}>
              {result.error}
            </div>
            {showResend && <ResendActivationForm defaultEmail={result.email || ""} />}
          </>
        )}

        {result?.success && (
          <>
            <div className="alert alert-success">{result.success}</div>
            <p className="page-lead">Já pode iniciar sessão e escolher o seu plano.</p>
            <div className="cta-row" style={{ marginTop: "1rem" }}>
              <Link href="/planos" className="btn btn-primary">
                Escolher plano
              </Link>
              <Link href="/login" className="btn btn-secondary">
                {t("loginLink")}
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
