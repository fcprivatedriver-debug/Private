import type { Metadata } from "next";
import { AuthShell } from "@/components/layout";
import { ForgotPasswordForm } from "@/components/auth";

export const metadata: Metadata = {
  title: "Recuperar palavra-passe",
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Recuperar acesso"
      subtitle="Enviaremos uma ligação para redefinir a sua palavra-passe."
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
