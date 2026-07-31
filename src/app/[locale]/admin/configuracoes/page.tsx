import { getLocale } from "next-intl/server";
import { AppShell } from "@/components/layout/AppShell";
import { PageGreeting } from "@/components/ui/PageGreeting";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { requireRole, getSiteSettings } from "@/lib/session";
import { Link } from "@/i18n/navigation";

export default async function AdminConfiguracoesPage() {
  await requireRole(["ADMIN"]);
  const locale = await getLocale();
  const settings = await getSiteSettings();

  return (
    <AppShell locale={locale}>
      <PageGreeting hello="Configurações" sub="Marca, contactos, tolerâncias e textos legais." />
      <p className="muted" style={{ marginBottom: "1rem" }}>
        <Link href="/admin">← Administração</Link>
      </p>
      <SettingsForm settings={settings} />
    </AppShell>
  );
}
