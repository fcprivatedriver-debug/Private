import { redirect } from "next/navigation";

/** Internal branding preview removed from production. */
export default async function BrandingPreviewRemoved({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}`);
}
