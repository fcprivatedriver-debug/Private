import type { Metadata } from "next";
import { AuthShell } from "@/components/layout";
import { RegisterForm } from "@/components/auth";

export const metadata: Metadata = {
  title: "Criar conta",
};

export default function RegisterPage() {
  return (
    <AuthShell
      title="Criar conta"
      subtitle="Registe-se como cliente ou motorista."
    >
      <RegisterForm />
    </AuthShell>
  );
}
