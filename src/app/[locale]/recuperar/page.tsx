import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { RecoverPasswordForm } from "@/components/auth/RecoverPasswordForm";

type Props = { params: Promise<{ locale: string }> };

export default async function RecuperarPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <Suspense
      fallback={
        <section className="auth-shell">
          <div className="container" style={{ maxWidth: 440 }}>
            <p className="page-lead">…</p>
          </div>
        </section>
      }
    >
      <RecoverPasswordForm />
    </Suspense>
  );
}
