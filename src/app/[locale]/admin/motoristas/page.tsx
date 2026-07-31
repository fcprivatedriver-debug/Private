import { redirect } from "next/navigation";

/** Multi-driver fleet UI removed — single operator FC Private Driver. */
export default async function AdminMotoristasRemovedPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/admin/viagens`);
}
