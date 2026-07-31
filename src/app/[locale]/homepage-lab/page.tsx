import { redirect } from "next/navigation";

/** Experimental Homepage Lab removed from production. */
export default async function HomepageLabRemoved({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}`);
}
