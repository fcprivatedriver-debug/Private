import { redirect } from "next/navigation";
import { defaultLocale } from "@/i18n/routing";

/** Root entry redirects to the default locale (Phase 0 i18n). */
export default function RootPage() {
  redirect(`/${defaultLocale}`);
}
