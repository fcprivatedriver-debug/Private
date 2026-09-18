import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { routing } from "@/i18n/routing";

/**
 * Layout locale CANÓNICO — APENAS providers + {children}.
 * NUNCA embutir a landing aqui (regressão 0079b05: /pt/login mostrava homepage).
 * Stamp: canonical-layout-children-v1
 */
export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as "pt" | "en")) notFound();
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <AuthProvider>
        {/* canonical-layout-children-v1 */}
        <ThemeProvider>{children}</ThemeProvider>
      </AuthProvider>
    </NextIntlClientProvider>
  );
}
