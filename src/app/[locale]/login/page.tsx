import { LoginForm } from "@/components/auth/LoginForm";
import { isDemoMode } from "@/lib/demo-mode";

export default function LoginPage() {
  return <LoginForm demoMode={isDemoMode()} />;
}
