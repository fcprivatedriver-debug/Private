import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ExternalDataAdminClient } from "@/components/admin/ExternalDataAdminClient";

/**
 * Painel técnico — a chave admin é obrigatória no cliente.
 * Utilizadores normais sem chave não conseguem desbloquear nem sync.
 */
export default async function ExternalDataAdminPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/pt/login");

  return <ExternalDataAdminClient />;
}
