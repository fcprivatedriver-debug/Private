import type { Metadata } from "next";
import { AuthShell } from "@/components/layout";
import { LoginForm } from "@/components/auth";

export const metadata: Metadata = {
  title: "Entrar",
};

export default function LoginPage() {
  return (
    <AuthShell
      title="Bem-vindo de volta"
      subtitle="Aceda à sua conta FC Private Driver."
    >
      <LoginForm />
    </AuthShell>
  );
}
