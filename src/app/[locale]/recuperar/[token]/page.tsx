import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export default async function RecuperarTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <ResetPasswordForm token={token} />;
}
