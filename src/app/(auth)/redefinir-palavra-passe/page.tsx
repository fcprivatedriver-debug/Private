import type { Metadata } from "next";
import { AuthShell } from "@/components/layout";
import { ResetPasswordForm } from "@/components/auth";

export const metadata: Metadata = {
  title: "Redefinir palavra-passe",
};

export default function ResetPasswordPage() {
  return (
    <AuthShell
      title="Nova palavra-passe"
      subtitle="Defina uma nova palavra-passe para a sua conta."
    >
      <ResetPasswordForm />
    </AuthShell>
  );
}
