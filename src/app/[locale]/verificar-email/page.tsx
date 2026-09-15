import { Suspense } from "react";
import { VerifyEmailPending } from "@/components/auth/VerifyEmailPending";

export default function VerificarEmailPage() {
  return (
    <Suspense fallback={<div className="auth-page"><div className="auth-card"><p>…</p></div></div>}>
      <VerifyEmailPending />
    </Suspense>
  );
}
