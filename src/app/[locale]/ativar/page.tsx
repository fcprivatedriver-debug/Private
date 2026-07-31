import { activateAccountAction } from "@/actions/auth";
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

  let result: { error?: string; success?: string } | null = null;
  if (token) {
    result = await activateAccountAction(token);
  }

  return (
    <section className="auth-shell fade-up">
      <div className="container" style={{ maxWidth: 520 }}>
        <h1 className="page-title">{t("activateTitle")}</h1>

        {!token && (
          <>
            <p className="page-lead">{t("activateMissing")}</p>
            <Link href="/login" className="btn btn-primary">
              {t("loginLink")}
            </Link>
          </>
        )}

        {result?.error && <div className="alert alert-error">{result.error}</div>}
        {result?.success && (
          <>
            <div className="alert alert-success">{result.success}</div>
            <Link href="/login" className="btn btn-primary">
              {t("loginLink")}
            </Link>
          </>
        )}
      </div>
    </section>
  );
}
